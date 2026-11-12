// Prompt phase: starting the game and collecting each player's bad take
import { v4 as uuid } from "uuid";
import * as repo from "../db/roomRepo";
import { emptyGameState, generateQueue } from "./state";
import { startTurn } from "./turns";

// TODO: Need to add logic to force faster entry of prompts based on timeLimit setting (that also would need to be added into schema)
export async function startGame(roomId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found")
    };

    console.log(`[RoomStore.startGame] Starting game for room ${roomId}`);

    await repo.setStatus(roomId, "PROMPT_ENTRY");

    const updatedRoom = await repo.getRoom(roomId);
    if (!updatedRoom) {
      throw new Error("Failed to fetch updated room state");
    }

    await repo.publishRoom(updatedRoom);
    return updatedRoom;

  } catch (error) {
    console.error(`[RoomStore.startGame] Failed to start game ${roomId}:`, error);
    throw error;
  }
}

// TODO: handle race conditions where multiple prompts are submitted at once
export async function submitPrompt(roomId: string, playerId: string, prompt: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    // Default game state if state doesn't exist
    const state = room.gameState || emptyGameState();

    // Add prompt
    state.prompts.push({
      id: uuid(),
      authorId: playerId,
      text: prompt
    });

    // Check to see if everyone has submitted
    if (state.prompts.length >= room.players.length) {
      // Generate the turn queue (who defends what)
      state.queue = generateQueue(room.players, state.prompts);

      // Save the state (before starting turn)
      await repo.saveGameState(roomId, state);

      // Transition to first turn
      await startTurn(roomId);
    } else {
      // Not all prompts in yet, just save state
      await repo.saveGameState(roomId, state);
    }

    // Notify subscribers in room
    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);
    return true;
  } catch (error) {
    console.error(`[RoomStore.submitPrompt] Failed to submit prompt for room ${roomId}:`, error);
    throw error;
  }
}
