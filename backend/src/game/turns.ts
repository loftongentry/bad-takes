// Defense/voting loop: advancing turns, ending a defense, and tallying votes
import * as repo from "../db/roomRepo";

// TODO: implement server side timers
export async function startTurn(roomId: string) {
  const room = await repo.getRoom(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  // Get raw state object
  const state = await repo.getStoredGameState(roomId);
  if (!state) {
    return;
  }

  // Pop the next turn from queue
  const nextTurn = state.queue.shift();

  if (!nextTurn) {
    // No more turns, transition to RESULTS
    console.log(`[GameLogic] No more turns in room ${roomId}, transitioning to RESULTS`);
    await repo.setStatus(roomId, "RESULTS");
  } else {
    state.currentTurn = nextTurn;

    // Save updated state
    await repo.beginTurn(roomId, state);
  }

  const finalRoom = await repo.getRoom(roomId);
  await repo.publishRoom(finalRoom);
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

      // Update defender score
      const defenderId = room.gameState?.currentTurn?.defenderId;
      const playerIndex = room.players.findIndex((p) => p.id === defenderId);

      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        player.score += roundScore;

        // Save updated player data
        await repo.savePlayer(roomId, player);
      }

      await startTurn(roomId);
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
