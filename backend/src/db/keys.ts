// Redis layout for a room:
//   room:{id}          hash    status, settings, gameState (JSON)
//   room:{id}:players  hash    playerId -> player JSON
//   room:{id}:votes    hash    playerId -> vote value (current turn only)
//   room:{id}:prompts  hash    playerId -> prompt JSON (one per player, current game only)
//   join:{CODE}        string  join code -> roomId

// How long a room survives with no activity. Every state change renews it (see touchRoom).
// Overridable so tests can check expiry without waiting an hour.
export const ROOM_TTL_SECONDS = Number(process.env.ROOM_TTL_SECONDS) || 60 * 60; // one hour

export const roomKey = (id: string) => `room:${id}`;
export const playersKey = (id: string) => `room:${id}:players`;
export const votesKey = (id: string) => `room:${id}:votes`;
export const promptsKey = (id: string) => `room:${id}:prompts`;
export const joinKey = (code: string) => `join:${code.toUpperCase()}`;

// Pub/sub channel that room subscriptions listen on
export const roomChannel = (id: string) => `ROOM:${id}`;
