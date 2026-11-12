// Data access for rooms: every Redis read/write and pub/sub publish lives here.
// Game rules live in ../game and only talk to Redis through these functions.
import { redis, pubsub } from "./redis";
import { roomKey, playersKey, votesKey, promptsKey, tokensKey, joinKey, roomChannel, ROOM_TTL_SECONDS } from "./keys";
import type { GameState, Player, Prompt, Room, RoomStatus, StoredGameState } from "../types";

// --- Reads ---

export async function getRoom(roomId: string): Promise<Room | null> {
  if (!roomId) return null;

  try {
    // Pipeline: Fetch room metadata + players in one trip
    const [roomRes, playersRes, votesRes, promptCountRes] = await redis
      .pipeline()
      .hgetall(roomKey(roomId))
      .hgetall(playersKey(roomId))
      .hgetall(votesKey(roomId))
      .hlen(promptsKey(roomId))
      .exec() as [any, any, any, any];

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
    if (promptCountRes[0]) {
      throw new Error(`Redis Pipeline Error (Prompts): ${promptCountRes[0]}`);
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

    // Injecting vote and prompt counts, which live in their own hashes
    if (gameState) {
      gameState.votesCast = Object.keys(votesData).length;
      gameState.votedPlayers = Object.keys(votesData);
      gameState.submittedPromptsCount = Number(promptCountRes[1]);
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
        // Rooms created before this setting existed default to 90 seconds
        promptTimeLimit: Number(roomData.promptTimeLimit) || 90,
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

export async function getPrompts(roomId: string): Promise<Prompt[]> {
  const raw = await redis.hvals(promptsKey(roomId));
  return raw.map((p) => JSON.parse(p));
}

type PhaseDeadline = { roomId: string; status: "PROMPT_ENTRY" | "DEFENSE" | "VOTING"; deadline: string };

// Every room currently in a timed phase (writing, defense or voting), with its deadline. Used
// on startup to restore the in-memory phase timers that a server restart would otherwise lose.
export async function getPhaseDeadlines(): Promise<PhaseDeadline[]> {
  const found: PhaseDeadline[] = [];
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "room:*", "COUNT", 200);
    cursor = next;
    for (const key of keys) {
      // Only the room hashes themselves (room:{id}), not room:{id}:players and friends
      if (key.split(":").length !== 2) continue;
      const [status, rawState] = await redis.hmget(key, "status", "gameState");
      if ((status !== "PROMPT_ENTRY" && status !== "DEFENSE" && status !== "VOTING") || !rawState) continue;
      const deadline = JSON.parse(rawState).deadline;
      if (deadline) {
        found.push({ roomId: key.slice("room:".length), status, deadline });
      }
    }
  } while (cursor !== "0");
  return found;
}

// --- Writes ---

export async function insertRoom(
  roomId: string,
  joinCode: string,
  roomMeta: Record<string, string | number>,
  host: Player,
  hostToken: string
) {
  const results = await redis.multi()
    .hset(roomKey(roomId), roomMeta)
    .expire(roomKey(roomId), ROOM_TTL_SECONDS)
    .hset(playersKey(roomId), host.id, JSON.stringify(host))
    .expire(playersKey(roomId), ROOM_TTL_SECONDS)
    .hset(tokensKey(roomId), hostToken, host.id)
    .expire(tokensKey(roomId), ROOM_TTL_SECONDS)
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
    .del(votesKey(roomId))
    .del(promptsKey(roomId))
    .del(tokensKey(roomId))
    .del(joinKey(joinCode))
    .exec();
}

export function savePlayer(roomId: string, player: Player) {
  return redis.hset(playersKey(roomId), player.id, JSON.stringify(player));
}

// A new player and the secret token that identifies them
export function addPlayer(roomId: string, player: Player, token: string) {
  return redis.multi()
    .hset(playersKey(roomId), player.id, JSON.stringify(player))
    .hset(tokensKey(roomId), token, player.id)
    .expire(tokensKey(roomId), ROOM_TTL_SECONDS)
    .exec();
}

// The player a secret token belongs to, or null
export function findPlayerIdByToken(roomId: string, token: string) {
  return redis.hget(tokensKey(roomId), token);
}

// Removes the player and their token, so the token stops working
export async function removePlayer(roomId: string, playerId: string) {
  const tokens = await redis.hgetall(tokensKey(roomId));
  const theirTokens = Object.keys(tokens).filter((token) => tokens[token] === playerId);
  const tx = redis.multi().hdel(playersKey(roomId), playerId);
  if (theirTokens.length > 0) {
    tx.hdel(tokensKey(roomId), ...theirTokens);
  }
  return tx.exec();
}

export function setStatus(roomId: string, status: RoomStatus) {
  return redis.hset(roomKey(roomId), "status", status);
}

// Stores a player's prompt (replacing any earlier one from them) and returns how many players
// have submitted. A single HSET per player means simultaneous submissions can't overwrite each other.
export async function savePrompt(roomId: string, prompt: Prompt): Promise<number> {
  const results = await redis.multi()
    .hset(promptsKey(roomId), prompt.authorId, JSON.stringify(prompt))
    .expire(promptsKey(roomId), ROOM_TTL_SECONDS)
    .hlen(promptsKey(roomId))
    .exec();

  const [err, count] = results?.[2] ?? [new Error("Redis transaction aborted"), 0];
  if (err) throw err;
  return Number(count);
}

// Runs atomically inside Redis: only advances if the room is still in the expected status,
// so when several requests race to advance the same turn, exactly one wins.
const ADVANCE_ROOM_SCRIPT = `
  if redis.call('HGET', KEYS[1], 'status') ~= ARGV[1] then
    return 0
  end
  redis.call('HSET', KEYS[1], 'status', ARGV[2], 'gameState', ARGV[3])
  redis.call('DEL', KEYS[2])
  if ARGV[4] ~= '' then
    redis.call('HSET', KEYS[3], ARGV[4], ARGV[5])
  end
  return 1
`;

// Moves the room from `fromStatus` to `toStatus` with a new game state, clears the votes, and
// optionally saves one player (the defender's new score). Returns false, changing nothing,
// if the room was no longer in `fromStatus` because another request already advanced it.
export async function advanceRoom(
  roomId: string,
  fromStatus: RoomStatus,
  toStatus: RoomStatus,
  state: StoredGameState,
  updatedPlayer?: Player
): Promise<boolean> {
  const result = await redis.eval(
    ADVANCE_ROOM_SCRIPT,
    3,
    roomKey(roomId),
    votesKey(roomId),
    playersKey(roomId),
    fromStatus,
    toStatus,
    JSON.stringify(state),
    updatedPlayer?.id ?? "",
    updatedPlayer ? JSON.stringify(updatedPlayer) : ""
  );
  return result === 1;
}

export function removePrompt(roomId: string, playerId: string) {
  return redis.hdel(promptsKey(roomId), playerId);
}

export function removeVote(roomId: string, playerId: string) {
  return redis.hdel(votesKey(roomId), playerId);
}

export function recordVote(roomId: string, playerId: string, value: number) {
  return redis.multi()
    .hset(votesKey(roomId), playerId, value.toString())
    .expire(votesKey(roomId), ROOM_TTL_SECONDS)
    .exec();
}

// Back to LOBBY with a fresh game state and no votes or prompts
export function resetRoomState(roomId: string, state: StoredGameState) {
  return redis.multi()
    .hset(roomKey(roomId), {
      "status": "LOBBY",
      "gameState": JSON.stringify(state)
    })
    .del(votesKey(roomId))
    .del(promptsKey(roomId))
    .exec();
}

// Renews the expiry on all of a room's keys, so a room only expires after ROOM_TTL_SECONDS
// with no activity, not that long after it was created. Keys that don't exist are skipped.
export function touchRoom(room: Room) {
  return redis.multi()
    .expire(roomKey(room.id), ROOM_TTL_SECONDS)
    .expire(playersKey(room.id), ROOM_TTL_SECONDS)
    .expire(votesKey(room.id), ROOM_TTL_SECONDS)
    .expire(promptsKey(room.id), ROOM_TTL_SECONDS)
    .expire(tokensKey(room.id), ROOM_TTL_SECONDS)
    .expire(joinKey(room.joinCode), ROOM_TTL_SECONDS)
    .exec();
}

// --- Pub/sub ---

// Every state change ends by publishing the updated room, so this is also where the room's
// expiry gets renewed.
export async function publishRoom(room: Room | null) {
  if (room && room.id) {
    try {
      await touchRoom(room);
    } catch (e) {
      console.error(`[RoomStore.touch] Failed to renew expiry for ${room.id}:`, e);
    }
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
