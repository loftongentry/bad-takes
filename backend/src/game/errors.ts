import { GraphQLError } from "graphql";

// What the app can do about an error, sent as the error's `extensions.code`:
//   ROOM_CLOSED   the room no longer exists (the host left, or it expired): go home
//   NOT_IN_ROOM   this player isn't in the room any more (removed by the host): go home
//   GAME_ERROR    anything else the player did that the game doesn't allow: show the message
export type GameErrorCode = "ROOM_CLOSED" | "NOT_IN_ROOM" | "GAME_ERROR";

// An error meant for the player: its message is shown in the app as-is, so it should say what
// happened in plain words. Any other error is treated as a bug: logged, and replaced with a
// generic message before it reaches the app (see formatError in index.ts).
export class GameError extends GraphQLError {
  constructor(message: string, code: GameErrorCode = "GAME_ERROR") {
    super(message, { extensions: { code } });
  }
}

export const roomClosedError = () =>
  new GameError(
    "This game has ended: the host left, or the room closed after an hour with nothing happening.",
    "ROOM_CLOSED",
  );
