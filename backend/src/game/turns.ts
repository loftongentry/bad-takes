// Defense/voting loop: advancing turns, timing and ending a defense, and tallying votes
import * as repo from "../db/roomRepo";
import type { Player, Room, RoomStatus, StoredGameState } from "../types";

// "Get ready" countdown before each defense. The app's defense screen uses the same value.
export const PREP_SECONDS = 5;

// Starts the next turn in the queue, or moves to RESULTS when the queue is empty.
// Turns belonging to players who have since left are skipped.
// Only happens if the room is still in `fromStatus`: when several requests race to advance
// the same turn (e.g. the last two votes arriving together), exactly one wins and the rest
// do nothing. Returns whether this call advanced the room.
export async function advanceToNextTurn(
  room: Room,
  fromStatus: RoomStatus,
  state: StoredGameState,
  scoredPlayer?: Player
) {
  const roomId = room.id;
  const stillHere = new Set(room.players.map((p) => p.id));

  // Pop the next turn from queue, skipping anyone who left
  let nextTurn = state.queue.shift();
  while (nextTurn && !stillHere.has(nextTurn.defenderId)) {
    nextTurn = state.queue.shift();
  }

  if (nextTurn) {
    state.currentTurn = nextTurn;
    // Absolute end of this defense. Every client counts down to it, and the server ends the turn when it passes.
    state.deadline = new Date(Date.now() + (PREP_SECONDS + room.settings.timeLimit) * 1000).toISOString();
  } else {
    state.deadline = null;
    console.log(`[GameLogic] No more turns in room ${roomId}, transitioning to RESULTS`);
  }

  const advanced = await repo.advanceRoom(roomId, fromStatus, nextTurn ? "DEFENSE" : "RESULTS", state, scoredPlayer);
  if (!advanced) {
    console.log(`[GameLogic] Room ${roomId} already advanced past ${fromStatus} by another request`);
    return false;
  }

  if (state.deadline) {
    scheduleDefenseEnd(roomId, state.deadline);
  }

  const finalRoom = await repo.getRoom(roomId);
  await repo.publishRoom(finalRoom);
  return true;
}

// --- Defense timer ---

// Timers live in this process's memory; restoreDefenseTimers() re-creates them from Redis
// on startup, so a server restart mid-turn doesn't leave a defense running forever.
export function scheduleDefenseEnd(roomId: string, deadline: string) {
  const delay = Math.max(0, Date.parse(deadline) - Date.now());
  setTimeout(() => {
    endDefenseAtDeadline(roomId, deadline).catch((error) => {
      console.error(`[GameLogic] Failed to end defense on time for room ${roomId}:`, error);
    });
  }, delay);
}

export async function restoreDefenseTimers() {
  const defenses = await repo.getDefenseDeadlines();
  for (const { roomId, deadline } of defenses) {
    scheduleDefenseEnd(roomId, deadline);
  }
  console.log(`[GameLogic] Restored ${defenses.length} defense timer(s)`);
}

// Ends the defense whose deadline this is. Does nothing if that defense already ended early
// or a later turn has started (its deadline will differ).
async function endDefenseAtDeadline(roomId: string, deadline: string) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== "DEFENSE" || room.gameState?.deadline !== deadline) {
    return;
  }

  console.log(`[GameLogic] Time's up for room ${roomId}`);
  await moveToVoting(roomId);
}

async function moveToVoting(roomId: string) {
  await repo.setStatus(roomId, "VOTING");

  const updatedRoom = await repo.getRoom(roomId);
  await repo.publishRoom(updatedRoom);
}

// The defender ending their own defense early. (When time runs out the server ends it.)
export async function endTurn(roomId: string, playerId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.status !== "DEFENSE") {
      return false;
    }

    if (room.gameState?.currentTurn?.defenderId !== playerId) {
      throw new Error("Only the defender can end their defense early");
    }

    console.log(`[GameLogic] Ending turn for room ${roomId}`);

    await moveToVoting(roomId);
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
    console.log(`[GameLogic] Player ${playerId} voted in room ${roomId}`);

    const tallied = await tallyIfAllVotesIn(roomId);
    if (!tallied) {
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true;
  } catch (error) {
    console.error(`[RoomStore.submitVote] Failed to submit vote for room ${roomId}:`, error);
    throw error;
  }
}

// If everyone still in the room (other than the defender) has voted, scores the defender
// and starts the next turn. Called after each vote and when a player leaves mid-vote.
// Returns whether it tallied.
export async function tallyIfAllVotesIn(roomId: string) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== "VOTING") {
    return false;
  }

  const defenderId = room.gameState?.currentTurn?.defenderId;
  const voterIds = new Set(room.players.filter((p) => p.id !== defenderId).map((p) => p.id));

  // Only votes from players still in the room count
  const votes = Object.entries(await repo.getVotes(roomId)).filter(([voterId]) => voterIds.has(voterId));

  console.log(`[GameLogic] Room ${roomId} has ${votes.length}/${voterIds.size} votes`);
  if (votes.length < voterIds.size) {
    return false;
  }

  console.log(`[GameLogic] All votes in for room ${roomId}, tallying votes`);
  const roundScore = votes.reduce((sum, [, vote]) => sum + Number(vote), 0);

  // Defender's new score is saved in the same atomic step that advances the turn,
  // so it can't be applied twice if another final vote arrives at the same moment
  const defender = room.players.find((p) => p.id === defenderId);
  const scoredDefender = defender ? { ...defender, score: defender.score + roundScore } : undefined;

  const state = await repo.getStoredGameState(roomId);
  if (!state) {
    return false;
  }
  await advanceToNextTurn(room, "VOTING", state, scoredDefender);
  return true;
}
