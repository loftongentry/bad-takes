// Prompt phase: starting the game and collecting each player's bad take
import { v4 as uuid } from "uuid";
import * as repo from "../db/roomRepo";
import { emptyGameState, generateQueue } from "./state";
import { advanceToNextTurn, schedulePhaseEnd } from "./turns";
import { requireHost, requirePlayer } from "./permissions";
import { MIN_PLAYERS, PROMPT_MAX, cleanText } from "./rules";

export async function startGame(roomId: string, hostToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    await requireHost(room, hostToken);
    if (room.status !== "LOBBY") {
      throw new Error("The game has already started");
    }
    // With one player there's nobody to vote, so the game could never finish
    if (room.players.length < MIN_PLAYERS) {
      throw new Error(`Need at least ${MIN_PLAYERS} players to start`);
    }

    console.log(`[RoomStore.startGame] Starting game for room ${roomId}`);

    // Players have until this deadline to write their take
    const state = emptyGameState();
    state.deadline = new Date(Date.now() + room.settings.promptTimeLimit * 1000).toISOString();

    // Atomic, so two "Start" taps can't both start the game
    const started = await repo.advanceRoom({
      roomId,
      from: "LOBBY",
      to: "PROMPT_ENTRY",
      expectedDeadline: room.gameState?.deadline,
      state,
    });
    if (!started) {
      throw new Error("The game has already started");
    }
    schedulePhaseEnd(roomId, "PROMPT_ENTRY", state.deadline);

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

export async function submitPrompt(roomId: string, playerToken: string, prompt: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    if (room.status !== "PROMPT_ENTRY") {
      throw new Error("Not accepting prompts right now");
    }
    const player = await requirePlayer(room, playerToken);
    const text = cleanText(prompt, "Your take", PROMPT_MAX);

    // One prompt per player, stored atomically: simultaneous submissions are all kept,
    // and a retry replaces the player's earlier prompt instead of counting twice
    const submittedCount = await repo.savePrompt(roomId, {
      id: uuid(),
      authorId: player.id,
      text,
    });

    if (submittedCount >= room.players.length) {
      await startTurnsIfAllPromptsIn(roomId);
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

// Builds the turn queue and starts the first turn once every player still in the room has
// submitted a take. Called after each submission and when a player leaves during prompt entry.
// With timeUp (the writing time ran out), plays with the takes that came in: everyone still
// defends, so some takes get defended more than once. If nobody wrote anything, the room goes
// back to the lobby.
// `deadline`, when given, limits this to that exact writing phase (the timer's own).
export async function startTurnsIfAllPromptsIn(
  roomId: string,
  { timeUp = false, deadline }: { timeUp?: boolean; deadline?: string } = {},
) {
  const room = await repo.getRoom(roomId);
  if (!room || room.status !== "PROMPT_ENTRY") {
    return;
  }
  if (deadline !== undefined && room.gameState?.deadline !== deadline) {
    return;
  }

  // Only prompts from players still in the room count
  const playerIds = new Set(room.players.map((p) => p.id));
  const prompts = (await repo.getPrompts(roomId)).filter((p) => playerIds.has(p.authorId));
  if (prompts.length < room.players.length && !timeUp) {
    return;
  }

  if (prompts.length === 0) {
    console.log(`[GameLogic] Nobody wrote a take in room ${roomId}, back to the lobby`);
    const backToLobby = await repo.advanceRoom({
      roomId,
      from: "PROMPT_ENTRY",
      to: "LOBBY",
      expectedDeadline: room.gameState?.deadline,
      state: emptyGameState(),
    });
    if (backToLobby) {
      await repo.publishRoom(await repo.getRoom(roomId));
    }
    return;
  }

  // Generate the turn queue (who defends what)
  const state = { ...emptyGameState(), prompts, queue: generateQueue(room.players, prompts) };

  // Transition to first turn. If the last few prompts arrive together, only one request starts it.
  await advanceToNextTurn(room, "PROMPT_ENTRY", state);
}
