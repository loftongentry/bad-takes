// Room lifecycle: create, join, leave, kick, and reset back to the lobby
import { v4 as uuid } from "uuid";
import { makeJoinCode } from "../utils/joinCode";
import * as repo from "../db/roomRepo";
import { emptyGameState } from "./state";
import { newPlayerToken, requireHost } from "./permissions";
import { handlePlayerLeft } from "./departures";
import { PLAYER_NAME_MAX, checkSettings, cleanText } from "./rules";
import type { Player, RoomSettings } from "../types";

// Returns the room plus the host's secret player token (only ever sent to the host)
export async function createRoom(rawHostName: string, rawSettings: RoomSettings) {
  const hostName = cleanText(rawHostName, "Name", PLAYER_NAME_MAX);
  const settings = checkSettings(rawSettings);
  const roomId = uuid();
  const joinCode = await repo.reserveJoinCode(roomId, makeJoinCode);

  console.log(`[RoomStore.create] Starting creation for host "${hostName}" (Room: ${roomId})`);

  const host: Player = { id: uuid(), name: hostName, isHost: true, score: 0 };
  const hostToken = newPlayerToken();

  const roomMeta = {
    id: roomId,
    joinCode,
    status: "LOBBY",
    lobbyName: settings.lobbyName,
    rounds: settings.rounds,
    playerLimit: settings.playerLimit,
    timeLimit: settings.timeLimit,
    promptTimeLimit: settings.promptTimeLimit,
    gameState: JSON.stringify(emptyGameState())
  };

  try {
    await repo.insertRoom(roomId, roomMeta, host, hostToken);

    console.log(`[RoomStore.create] Success. Room ID: ${roomId}, Join Code: ${joinCode}`);

    const room = await repo.getRoom(roomId);
    await repo.publishRoom(room);
    return { room, hostId: host.id, hostToken };

  } catch (error) {
    console.error(`[RoomStore.create] Failed to create room:`, error);
    throw error;
  }
}

export async function joinRoom(joinCode: string, rawPlayerName: string) {
  try {
    const playerName = cleanText(rawPlayerName, "Name", PLAYER_NAME_MAX);
    const roomId = await repo.findRoomIdByCode(joinCode);
    if (!roomId) {
      console.error(`[RoomStore.join] Invalid code attempt: ${joinCode}`);
      throw new Error("Invalid join code");
    }

    const newPlayer: Player = { id: uuid(), name: playerName, isHost: false, score: 0 };
    const playerToken = newPlayerToken();

    // The checks and the write happen in one atomic step, so simultaneous joins can't exceed
    // the player limit and a join can't slip in as the game starts or the room closes
    const result = await repo.addPlayerIfOpen(roomId, newPlayer, playerToken);
    if (result === "gone") {
      throw new Error("Room found in index but missing in storage (Expired?)");
    }
    if (result === "started") {
      throw new Error("Cannot join, game already started");
    }
    if (result === "full") {
      throw new Error("Room is full");
    }

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);

    console.log(`[RoomStore.join] ${playerName} joined room ${roomId}`);
    return { room: updatedRoom, playerId: newPlayer.id, playerToken };

  } catch (error: any) {
    console.error(`[RoomStore.join] Error joining with code ${joinCode}:`, error.message);
    throw error;
  }
}

// A host leaving closes the room. Anyone else leaving mid-game is handled by handlePlayerLeft.
export async function leaveRoom(roomId: string, playerToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      console.warn(`[RoomStore.leave] Ignored: Room ${roomId} does not exist`);
      return false;
    }

    const playerId = await repo.findPlayerIdByToken(roomId, playerToken);
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !playerId) {
      console.warn(`[RoomStore.leave] Ignored: unknown player token for room ${roomId}`);
      return false;
    }

    if (player.isHost) {
      console.log(`[RoomStore.leave] Host left. Destroying room ${roomId}`);

      await repo.deleteRoom(roomId, room.joinCode);
      await repo.publishRoomClosed(room.id);
    } else {
      console.log(`[RoomStore.leave] Player ${playerId} left room ${roomId}`);

      await repo.removePlayer(roomId, playerId);
      await handlePlayerLeft(roomId, playerId);
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true
  } catch (error) {
    console.error(`[RoomStore.leave] Error handling leave for ${roomId}:`, error);
    return false;
  }
}

// `playerId` is the (public) id of the player to remove
export async function kickPlayer(roomId: string, hostToken: string, playerId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    const host = await requireHost(room, hostToken);
    if (playerId === host.id) {
      throw new Error("The host can't kick themselves");
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      console.warn(`[RoomStore.kick] Failed: Player ${playerId} not found in ${roomId}`);
      return false;
    }

    console.log(`[RoomStore.kick] Kicking player ${playerId} from ${roomId}`);

    await repo.removePlayer(roomId, playerId);
    await handlePlayerLeft(roomId, playerId);
    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);

    return true;
  } catch (error) {
    console.error(`[RoomStore.kick] Error kicking player:`, error);
    throw error;
  }
}

export async function resetGame(roomId: string, hostToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    await requireHost(room, hostToken);

    console.log(`[GameLogic] Resetting game for room ${roomId}`);

    // Zeroes scores and returns to the lobby in one atomic step, only once the game is over
    if (!(await repo.resetToLobby(roomId, emptyGameState()))) {
      throw new Error("You can only play again once the game is over");
    }

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);
    return true;
  } catch (error) {
    console.error(`[RoomStore.resetGame] Failed to reset game for room ${roomId}:`, error);
    throw error;
  }
}
