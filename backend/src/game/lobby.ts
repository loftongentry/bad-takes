// Room lifecycle: create, join, leave, kick, and reset back to the lobby
import { v4 as uuid } from "uuid";
import { makeJoinCode } from "../utils/joinCode";
import * as repo from "../db/roomRepo";
import { emptyGameState } from "./state";
import { newPlayerToken, requireHost } from "./permissions";
import { handlePlayerLeft } from "./departures";
import { GameError, roomClosedError } from "./errors";
import { PLAYER_NAME_MAX, checkSettings, cleanText } from "./rules";
import type { Player, RoomSettings } from "../types";
import { logFailure, logger } from "../logger";

// Returns the room plus the host's secret player token (only ever sent to the host)
export async function createRoom(rawHostName: string, rawSettings: RoomSettings) {
  const hostName = cleanText(rawHostName, "Name", PLAYER_NAME_MAX);
  const settings = checkSettings(rawSettings);
  const roomId = uuid();
  const joinCode = await repo.reserveJoinCode(roomId, makeJoinCode);

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
    gameState: JSON.stringify(emptyGameState()),
  };

  try {
    await repo.insertRoom(roomId, roomMeta, host, hostToken);

    logger.info({ roomId, joinCode }, "room created");

    const room = await repo.getRoom(roomId);
    await repo.publishRoom(room);
    return { room, hostId: host.id, hostToken };
  } catch (error) {
    logFailure("createRoom", error, { roomId });
    throw error;
  }
}

export async function joinRoom(joinCode: string, rawPlayerName: string) {
  try {
    const playerName = cleanText(rawPlayerName, "Name", PLAYER_NAME_MAX);
    const roomId = await repo.findRoomIdByCode(joinCode);
    if (!roomId) {
      throw new GameError("There's no game with that code. Check it and try again.");
    }

    const newPlayer: Player = { id: uuid(), name: playerName, isHost: false, score: 0 };
    const playerToken = newPlayerToken();

    // The checks and the write happen in one atomic step, so simultaneous joins can't exceed
    // the player limit and a join can't slip in as the game starts or the room closes
    const result = await repo.addPlayerIfOpen(roomId, newPlayer, playerToken);
    if (result === "gone") {
      throw roomClosedError();
    }
    if (result === "started") {
      throw new GameError("That game has already started. You can join when they play again.");
    }
    if (result === "full") {
      throw new GameError("That game is full.");
    }

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);

    logger.info({ roomId, playerId: newPlayer.id }, "player joined");
    return { room: updatedRoom, playerId: newPlayer.id, playerToken };
  } catch (error) {
    logFailure("joinRoom", error, { joinCode });
    throw error;
  }
}

// A host leaving closes the room. Anyone else leaving mid-game is handled by handlePlayerLeft.
export async function leaveRoom(roomId: string, playerToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      logger.debug({ roomId }, "leave ignored: no such room");
      return false;
    }

    const playerId = await repo.findPlayerIdByToken(roomId, playerToken);
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !playerId) {
      logger.debug({ roomId }, "leave ignored: not a player");
      return false;
    }

    if (player.isHost) {
      logger.info({ roomId }, "host left, room closed");

      await repo.deleteRoom(roomId, room.joinCode);
      await repo.publishRoomClosed(room.id);
    } else {
      logger.info({ roomId, playerId }, "player left");

      await repo.removePlayer(roomId, playerId);
      await handlePlayerLeft(roomId, playerId);
      const updatedRoom = await repo.getRoom(roomId);
      await repo.publishRoom(updatedRoom);
    }

    return true;
  } catch (error) {
    logFailure("leaveRoom", error, { roomId });
    return false;
  }
}

// `playerId` is the (public) id of the player to remove
export async function kickPlayer(roomId: string, hostToken: string, playerId: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw roomClosedError();
    }
    const host = await requireHost(room, hostToken);
    if (playerId === host.id) {
      throw new GameError("The host can't remove themselves");
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      logger.debug({ roomId, playerId }, "kick ignored: not in the room");
      return false;
    }

    logger.info({ roomId, playerId }, "player removed by the host");

    await repo.removePlayer(roomId, playerId);
    await handlePlayerLeft(roomId, playerId);
    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);

    return true;
  } catch (error) {
    logFailure("kickPlayer", error, { roomId, playerId });
    throw error;
  }
}

export async function resetGame(roomId: string, hostToken: string) {
  try {
    const room = await repo.getRoom(roomId);
    if (!room) {
      throw roomClosedError();
    }
    await requireHost(room, hostToken);

    logger.info({ roomId }, "play again: back to the lobby");

    // Zeroes scores and returns to the lobby in one atomic step, only once the game is over
    if (!(await repo.resetToLobby(roomId, emptyGameState()))) {
      throw new GameError("You can only play again once the game is over");
    }

    const updatedRoom = await repo.getRoom(roomId);
    await repo.publishRoom(updatedRoom);
    return true;
  } catch (error) {
    logFailure("resetGame", error, { roomId });
    throw error;
  }
}
