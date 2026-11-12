import { randomBytes } from "crypto";
import * as repo from "../db/roomRepo";
import type { Player, Room } from "../types";

// Players prove who they are with a secret token, handed only to their own device when they
// create or join a room. Player ids are public (every player sees everyone's), so an id alone
// never authorizes anything.
export function newPlayerToken() {
  return randomBytes(24).toString("base64url");
}

// The player this token belongs to, or an error if it doesn't belong to anyone in the room
export async function requirePlayer(room: Room, token: string): Promise<Player> {
  const playerId = await repo.findPlayerIdByToken(room.id, token);
  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("You're not a player in this room");
  }
  return player;
}

export async function requireHost(room: Room, token: string): Promise<Player> {
  const player = await requirePlayer(room, token);
  if (!player.isHost) {
    throw new Error("Only the host can do that");
  }
  return player;
}
