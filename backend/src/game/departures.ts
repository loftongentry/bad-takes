// Keeps a game in progress moving when a (non-host) player leaves or is kicked.
// (When the host leaves, the whole room is closed instead.)
import * as repo from "../db/roomRepo";
import { emptyGameState } from "./state";
import { MIN_PLAYERS, startTurnsIfAllPromptsIn } from "./prompts";
import { advanceToNextTurn, tallyIfAllVotesIn } from "./turns";

// Call after the player has been removed from the room
export async function handlePlayerLeft(roomId: string, playerId: string) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status === "LOBBY" || room.status === "RESULTS") {
    return;
  }

  // Nobody left to vote, so the game can't continue: end it
  if (room.players.length < MIN_PLAYERS) {
    console.log(`[GameLogic] Room ${roomId} dropped below ${MIN_PLAYERS} players, ending the game`);
    const state = (await repo.getStoredGameState(roomId)) ?? emptyGameState();
    state.queue = [];
    state.deadline = null;
    const ended = await repo.advanceRoom({
      roomId,
      from: room.status,
      to: "RESULTS",
      expectedDeadline: room.gameState?.deadline,
      state,
    });
    if (ended) {
      await repo.publishRoom(await repo.getRoom(roomId));
    }
    return;
  }

  if (room.status === "PROMPT_ENTRY") {
    // Their prompt goes too, and everyone else may now be done
    await repo.removePrompt(roomId, playerId);
    await startTurnsIfAllPromptsIn(roomId);
    return;
  }

  // DEFENSE or VOTING
  if (room.gameState?.currentTurn?.defenderId === playerId) {
    // Nobody is left to defend (or be scored for) this take: move straight to the next turn
    const state = await repo.getStoredGameState(roomId);
    if (state) {
      await advanceToNextTurn(room, room.status, state);
    }
  } else if (room.status === "VOTING") {
    // Their vote no longer counts, and the remaining votes may now be enough
    await repo.removeVote(roomId, playerId);
    await tallyIfAllVotesIn(roomId);
  }
  // A player whose turn hasn't come up yet is skipped when the queue reaches them
}
