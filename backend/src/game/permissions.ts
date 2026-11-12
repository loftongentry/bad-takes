import type { Room } from "../types";

// Player ids are random UUIDs that only that player's device knows, so a request
// carrying the host's id is treated as coming from the host.
export function requireHost(room: Room, playerId: string) {
  const player = room.players.find((p) => p.id === playerId);
  if (!player?.isHost) {
    throw new Error("Only the host can do that");
  }
}
