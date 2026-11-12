// Data access for rooms: every Redis read/write and pub/sub publish lives here.
// Game rules live in ../game and only talk to Redis through these functions.
import { redis, pubsub } from "./redis";
import { roomKey, playersKey, votesKey, joinKey, roomChannel, ROOM_TTL_SECONDS } from "./keys";
import type { GameState, Player, Room, RoomStatus, StoredGameState } from "../types";

// --- Reads ---

export async function getRoom(roomId: string): Promise<Room | null> {
  if (!roomId) return null;

  try {
    // Pipeline: Fetch room metadata + players in one trip
    const [roomRes, playersRes, votesRes] = await redis
      .pipeline()
      .hgetall(roomKey(roomId))
      .hgetall(playersKey(roomId))
      .hgetall(votesKey(roomId))
      .exec() as [any, any, any];

    // Check for Pipeline Errors
    if (roomRes[0]) {
      throw new Error(`Redis Pipeline Error (Room): ${roomRes[0]}`);
    }
    if (playersRes[0]) {
      throw new Error(`Redis Pipeline Error (Players): ${playersRes[0]}`);
    }
    if (votesRes[0]) {
      throw new Error(`Redis Pipeline Error (Votes): ${votesRes[0]}`);
    }

    const roomData = roomRes[1];
    const playersData = playersRes[1];
    const votesData = votesRes[1] || {};

    if (!roomData || Object.keys(roomData).length === 0) {
      return null;
    }

    let players: Player[] = [];
    try {
      players = Object.values(playersData).map((p: any) => JSON.parse(p));
    } catch (parseErr) {
      console.error(`[RoomStore.get] Failed to parse players for room ${roomId}:`, parseErr);
      players = [];
    }

    let gameState: GameState | null = null;
    try {
      gameState = roomData.gameState ? JSON.parse(roomData.gameState) : null;
    } catch (parseErr) {
      console.error(`[RoomStore.get] Failed to parse gameState for room ${roomId}:`, parseErr);
    }

    // Injecting vote data manually
    if (gameState) {
      gameState.votesCast = Object.keys(votesData).length;
      gameState.votedPlayers = Object.keys(votesData);
    }

    return {
      id: roomId,
      joinCode: roomData.joinCode,
      status: roomData.status as RoomStatus,
      settings: {
        lobbyName: roomData.lobbyName || "Default Lobby",
        rounds: Number(roomData.rounds),
        playerLimit: Number(roomData.playerLimit),
        timeLimit: Number(roomData.timeLimit),
      },
      players: players,
      gameState
    };

  } catch (error) {
    console.error(`[RoomStore.get] Critical failure fetching room ${roomId}:`, error);
    throw new Error("Internal database error");
  }
}

export function findRoomIdByCode(joinCode: string) {
  return redis.get(joinKey(joinCode));
}

// Reads the persisted game state directly, without the vote info getRoom() derives
export async function getStoredGameState(roomId: string): Promise<StoredGameState | null> {
  const rawState = await redis.hget(roomKey(roomId), "gameState");
  return rawState ? JSON.parse(rawState) : null;
}

export function getVotes(roomId: string) {
  return redis.hgetall(votesKey(roomId));
}

// --- Writes ---

export async function insertRoom(
  roomId: string,
  joinCode: string,
  roomMeta: Record<string, string | number>,
  host: Player
) {
  const results = await redis.multi()
    .hset(roomKey(roomId), roomMeta)
    .expire(roomKey(roomId), ROOM_TTL_SECONDS)
    .hset(playersKey(roomId), host.id, JSON.stringify(host))
    .expire(playersKey(roomId), ROOM_TTL_SECONDS)
    .setex(joinKey(joinCode), ROOM_TTL_SECONDS, roomId)
    .exec();

  // Check transaction results
  const errors = results?.filter(r => r[0] !== null);
  if (errors && errors.length > 0) {
    throw new Error(`Redis Transaction Failed: ${errors[0][0]}`);
  }
}

export function deleteRoom(roomId: string, joinCode: string) {
  return redis.multi()
    .del(roomKey(roomId))
    .del(playersKey(roomId))
    .del(joinKey(joinCode))
    .exec();
}

export function savePlayer(roomId: string, player: Player) {
  return redis.hset(playersKey(roomId), player.id, JSON.stringify(player));
}

export function removePlayer(roomId: string, playerId: string) {
  return redis.hdel(playersKey(roomId), playerId);
}

export function setStatus(roomId: string, status: RoomStatus) {
  return redis.hset(roomKey(roomId), "status", status);
}

export function saveGameState(roomId: string, state: StoredGameState) {
  return redis.hset(roomKey(roomId), "gameState", JSON.stringify(state));
}

// Saves the state with its new current turn, moves to DEFENSE, and clears last turn's votes
export function beginTurn(roomId: string, state: StoredGameState) {
  return redis.multi()
    .hset(roomKey(roomId), "gameState", JSON.stringify(state))
    .hset(roomKey(roomId), "status", "DEFENSE")
    .del(votesKey(roomId))
    .exec();
}

export function recordVote(roomId: string, playerId: string, value: number) {
  return redis.hset(votesKey(roomId), playerId, value.toString());
}

// Back to LOBBY with a fresh game state and no votes
export function resetRoomState(roomId: string, state: StoredGameState) {
  return redis.multi()
    .hset(roomKey(roomId), {
      "status": "LOBBY",
      "gameState": JSON.stringify(state)
    })
    .del(votesKey(roomId))
    .exec();
}

// --- Pub/sub ---

export async function publishRoom(room: Room | null) {
  if (room && room.id) {
    try {
      await pubsub.publish(roomChannel(room.id), { room });
    } catch (e) {
      console.error(`[RoomStore.publish] PubSub failure for ${room.id}:`, e);
    }
  }
}

// Tells subscribers the room is gone. Unlike publishRoom, errors propagate to the caller.
export function publishRoomClosed(roomId: string) {
  return pubsub.publish(roomChannel(roomId), { room: null });
}
