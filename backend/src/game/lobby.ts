// Room lifecycle: create, join, leave, kick, and reset back to the lobby
import { v4 as uuid } from "uuid";
import { makeJoinCode } from "../utils/joinCode";
import * as repo from "../db/roomRepo";
import { emptyGameState } from "./state";
import { requireHost } from "./permissions";
import { handlePlayerLeft } from "./departures";
import type { Player, RoomSettings } from "../types";

export async function createRoom(hostName: string, settings: RoomSettings) {
  const roomId = uuid();
  const joinCode = makeJoinCode();

  console.log(`[RoomStore.create] Starting creation for host "${hostName}" (Room: ${roomId})`);

  const host: Player = { id: uuid(), name: hostName, isHost: true, score: 0 };

  const roomMeta = {
    id: roomId,
    joinCode,
    status: "LOBBY",
    lobbyName: settings.lobbyName,
    rounds: settings.rounds,
    playerLimit: settings.playerLimit,
    timeLimit: settings.timeLimit,
    gameState: JSON.stringify(emptyGameState())
  };

  try {
    await repo.insertRoom(roomId, joinCode, roomMeta, host);

    console.log(`[RoomStore.create] Success. Room ID: ${roomId}, Join Code: ${joinCode}`);

    const room = await repo.getRoom(roomId);
    await repo.publishRoom(room);
    return room;

  } catch (error) {
    console.error(`[RoomStore.create] Failed to create room:`, error);
    throw error;
  }
}

export async function joinRoom(joinCode: string, playerName: string) {
  try {
    const roomId = await repo.findRoomIdByCode(joinCode);
    if (!roomId) {
      console.error(`[RoomStore.join] Invalid code attempt: ${joinCode}`);
      throw new Error("Invalid join code");
    }

    const room = await repo.getRoom(roomId);

    if (!room) {
      throw new Error("Room found in index but missing in storage (Expired?)");
    }
    if (room.status !== "LOBBY") {
      throw new Error("Cannot join, game already started");
    }
    if (room.players.length >= room.settings.playerLimit) {
      throw new Error("Room is full");
    }

    const newPlayer: Player = { id: uuid(), name: playerName, isHost: false, score: 0 };

    await repo.savePlayer(roomId, newPlayer);

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);

    console.log(`[RoomStore.join] ${playerName} joined room ${roomId}`);
    return { room: updatedRoom, playerId: newPlayer.id };

  } catch (error: any) {
    console.error(`[RoomStore.join] Error joining with code ${joinCode}:`, error.message);
    throw error;
  }
}

// A host leaving closes the room. Anyone else leaving mid-game is handled by handlePlayerLeft.
export async function leaveRoom(roomId: string, playerId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      console.warn(`[RoomStore.leave] Ignored: Room ${roomId} does not exist`);
      return false;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      console.warn(`[RoomStore.leave] Ignored: Player ${playerId} not in room ${roomId}`);
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

export async function kickPlayer(roomId: string, hostId: string, playerId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    requireHost(room, hostId);
    if (playerId === hostId) {
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

export async function resetGame(roomId: string, hostId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw new Error("Room not found");
    }
    requireHost(room, hostId);

    console.log(`[GameLogic] Resetting game for room ${roomId}`);

    const scorePromises = room.players.map((p) => {
      p.score = 0;
      return repo.savePlayer(roomId, p);
    });
    await Promise.all(scorePromises);

    await repo.resetRoomState(roomId, emptyGameState());

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);
    return true;
  } catch (error) {
    console.error(`[RoomStore.resetGame] Failed to reset game for room ${roomId}:`, error);
    throw error;
  }
}
