// Prompt phase: starting the game and collecting each player's bad take
import { v4 as uuid } from "uuid";
import * as repo from "../db/roomRepo";
import { emptyGameState, generateQueue } from "./state";
import { advanceToNextTurn } from "./turns";
import { requireHost } from "./permissions";

export const MIN_PLAYERS = 2;

// TODO: Need to add logic to force faster entry of prompts based on timeLimit setting (that also would need to be added into schema)
export async function startGame(roomId: string, hostId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found")
    };
    requireHost(room, hostId);
    if (room.status !== "LOBBY") {
      throw new Error("The game has already started");
    }
    // With one player there's nobody to vote, so the game could never finish
    if (room.players.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players to start`);
    }

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

export async function submitPrompt(roomId: string, playerId: string, prompt: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status !== "PROMPT_ENTRY") {
      throw new Error("Not accepting prompts right now");
    }
    if (!room.players.some((p) => p.id === playerId)) {
      throw new Error("Player is not in this room");
    }

    // One prompt per player, stored atomically: simultaneous submissions are all kept,
    // and a retry replaces the player's earlier prompt instead of counting twice
    const submittedCount = await repo.savePrompt(roomId, {
      id: uuid(),
      authorId: playerId,
      text: prompt
    });

    // Check to see if everyone has submitted
    if (submittedCount >= room.players.length) {
      // Generate the turn queue (who defends what)
      const prompts = await repo.getPrompts(roomId);
      const state = { ...emptyGameState(), prompts, queue: generateQueue(room.players, prompts) };

      // Transition to first turn. If the last few prompts arrive together, only one request starts it.
      await advanceToNextTurn(roomId, "PROMPT_ENTRY", state);
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
