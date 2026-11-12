// Defense/voting loop: advancing turns, ending a defense, and tallying votes
import * as repo from "../db/roomRepo";
import type { Player, RoomStatus, StoredGameState } from "../types";

// Starts the next turn in the queue, or moves to RESULTS when the queue is empty.
// Only happens if the room is still in `fromStatus`: when several requests race to advance
// the same turn (e.g. the last two votes arriving together), exactly one wins and the rest
// do nothing. Returns whether this call advanced the room.
// TODO: implement server side timers
export async function advanceToNextTurn(
  roomId: string,
  fromStatus: RoomStatus,
  state: StoredGameState,
  scoredPlayer?: Player
) {
  // Pop the next turn from queue
  const nextTurn = state.queue.shift();
  if (nextTurn) {
    state.currentTurn = nextTurn;
  } else {
    console.log(`[GameLogic] No more turns in room ${roomId}, transitioning to RESULTS`);
  }

  const advanced = await repo.advanceRoom(roomId, fromStatus, nextTurn ? "DEFENSE" : "RESULTS", state, scoredPlayer);
  if (!advanced) {
    console.log(`[GameLogic] Room ${roomId} already advanced past ${fromStatus} by another request`);
    return false;
  }

  const finalRoom = await repo.getRoom(roomId);
  await repo.publishRoom(finalRoom);
  return true;
}

export async function endTurn(roomId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "DEFENSE") {
      return false;
    }

    console.log(`[GameLogic] Ending turn for room ${roomId}`);

    await repo.setStatus(roomId, "VOTING");

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);
    return true;
  } catch (error) {
    console.error(`[RoomStore.endTurn] Failed to end turn for room ${roomId}:`, error);
    throw error;
  }
}

export async function submitVote(roomId: string, playerId: string, value: number) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "VOTING") {
      throw new Error("Not in voting phase");
    }

    const defenderId = room.gameState?.currentTurn?.defenderId;
    if (!room.players.some((p) => p.id === playerId)) {
      throw new Error("Player is not in this room");
    }
    if (playerId === defenderId) {
      throw new Error("The defender can't vote on their own defense");
    }
    if (value !== 1 && value !== -1) {
      throw new Error("Vote must be 1 or -1");
    }

    await repo.recordVote(roomId, playerId, value);

    // Get the exact number of votes right now
    const votesData = await repo.getVotes(roomId);
    const votersCount = Object.keys(votesData).length;

    const requiredVotes = room.players.length - 1;

    console.log(`[GameLogic] Player ${playerId} voted in room ${roomId} (${votersCount}/${requiredVotes})`);

    if (votersCount >= requiredVotes) {
      console.log(`[GameLogic] All votes in for room ${roomId}, tallying votes`);

      // Calculate score from fetched data
      let roundScore = 0;
      for (const vote of Object.values(votesData)) {
        roundScore += Number(vote);
      }

      // Defender's new score is saved in the same atomic step that advances the turn,
      // so it can't be applied twice if another final vote arrives at the same moment
      const defender = room.players.find((p) => p.id === defenderId);
      const scoredDefender = defender ? { ...defender, score: defender.score + roundScore } : undefined;

      const state = await repo.getStoredGameState(roomId);
      if (state) {
        await advanceToNextTurn(roomId, "VOTING", state, scoredDefender);
      }
    } else {
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true;
  } catch (error) {
    console.error(`[RoomStore.submitVote] Failed to submit vote for room ${roomId}:`, error);
    throw error;
  }
}
