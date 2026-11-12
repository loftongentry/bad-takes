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

// Claims an unused join code for the room. Each attempt only succeeds if the code isn't already
// taken (SET NX), so a new room can never take over a live room's code.
export async function reserveJoinCode(roomId: string, generate: () => string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generate();
    if (await redis.set(joinKey(code), roomId, "EX", ROOM_TTL_SECONDS, "NX")) {
      return code;
    }
  }
  throw new Error("Couldn't find a free join code, please try again");
}

// Stores a new room. Its join code must already be reserved with reserveJoinCode.
export async function insertRoom(
  roomId: string,
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

// Runs atomically inside Redis, so the room can't fill up, start or be deleted between the
// checks and the write (simultaneous joins could otherwise exceed the player limit).
const ADD_PLAYER_SCRIPT = `
  local status = redis.call('HGET', KEYS[1], 'status')
  if not status then return 'gone' end
  if status ~= 'LOBBY' then return 'started' end
  local limit = tonumber(redis.call('HGET', KEYS[1], 'playerLimit'))
  if redis.call('HLEN', KEYS[2]) >= limit then return 'full' end
  redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
  redis.call('HSET', KEYS[3], ARGV[3], ARGV[1])
  redis.call('EXPIRE', KEYS[2], ARGV[4])
  redis.call('EXPIRE', KEYS[3], ARGV[4])
  return 'ok'
`;

// Adds a new player and the secret token that identifies them, if the room still exists, is in
// the lobby and has space. Returns "ok", or why not: "gone", "started" or "full".
export async function addPlayerIfOpen(roomId: string, player: Player, token: string) {
  return (await redis.eval(
    ADD_PLAYER_SCRIPT,
    3,
    roomKey(roomId),
    playersKey(roomId),
    tokensKey(roomId),
    player.id,
    JSON.stringify(player),
    token,
    ROOM_TTL_SECONDS
  )) as "ok" | "gone" | "started" | "full";
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

// Runs atomically inside Redis: only advances if the room is still in the same phase AND the
// same turn of it (identified by its deadline, which is unique to each timed phase). So when
// several requests race to advance the same turn, exactly one wins, and a stale request can
// never advance a later turn that happens to be in the same phase.
const ADVANCE_ROOM_SCRIPT = `
  if redis.call('HGET', KEYS[1], 'status') ~= ARGV[1] then
    return 0
  end
  local current = ''
  local raw = redis.call('HGET', KEYS[1], 'gameState')
  if raw then
    local ok, decoded = pcall(cjson.decode, raw)
    if ok and type(decoded.deadline) == 'string' then current = decoded.deadline end
  end
  if current ~= ARGV[6] then
    return 0
  end
  redis.call('HSET', KEYS[1], 'status', ARGV[2], 'gameState', ARGV[3])
  redis.call('DEL', KEYS[2])
  -- Only update a player who is still in the room (they may have just left)
  if ARGV[4] ~= '' and redis.call('HEXISTS', KEYS[3], ARGV[4]) == 1 then
    redis.call('HSET', KEYS[3], ARGV[4], ARGV[5])
  end
  return 1
`;

// Moves the room from `from` to `to` with a new game state, clears the votes, and optionally
// saves one player (the defender's new score). `expectedDeadline` is the deadline of the phase
// being left (null if it has none), as read by the caller. Returns false, changing nothing, if
// the room has moved on since then because another request already advanced it.
export async function advanceRoom({
  roomId,
  from,
  to,
  expectedDeadline,
  state,
  updatedPlayer,
}: {
  roomId: string
  from: RoomStatus
  to: RoomStatus
  expectedDeadline: string | null | undefined
  state: StoredGameState
  updatedPlayer?: Player
}): Promise<boolean> {
  const result = await redis.eval(
    ADVANCE_ROOM_SCRIPT,
    3,
    roomKey(roomId),
    votesKey(roomId),
    playersKey(roomId),
    from,
    to,
    JSON.stringify(state),
    updatedPlayer?.id ?? "",
    updatedPlayer ? JSON.stringify(updatedPlayer) : "",
    expectedDeadline ?? ""
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

// Runs atomically inside Redis: zeroes the scores of the players currently in the room (not a
// stale list, which could re-add someone who just left) and returns to the lobby, only from
// RESULTS so it can never cross a vote tally that's still finishing.
const RESET_TO_LOBBY_SCRIPT = `
  if redis.call('HGET', KEYS[1], 'status') ~= 'RESULTS' then
    return 0
  end
  local players = redis.call('HGETALL', KEYS[2])
  for i = 1, #players, 2 do
    local player = cjson.decode(players[i + 1])
    player.score = 0
    redis.call('HSET', KEYS[2], players[i], cjson.encode(player))
  end
  redis.call('HSET', KEYS[1], 'status', 'LOBBY', 'gameState', ARGV[1])
  redis.call('DEL', KEYS[3], KEYS[4])
  return 1
`;

// RESULTS -> LOBBY with scores zeroed, a fresh game state and no votes or prompts.
// Returns false, changing nothing, if the room isn't showing results.
export async function resetToLobby(roomId: string, state: StoredGameState): Promise<boolean> {
  const result = await redis.eval(
    RESET_TO_LOBBY_SCRIPT,
    4,
    roomKey(roomId),
    playersKey(roomId),
    votesKey(roomId),
    promptsKey(roomId),
    JSON.stringify(state)
  );
  return result === 1;
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
