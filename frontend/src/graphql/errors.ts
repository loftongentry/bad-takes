import { CombinedGraphQLErrors, ServerError, ServerParseError } from "@apollo/client/errors";

// The server's error codes (see backend/src/game/errors.ts)
export type GameErrorCode = "ROOM_CLOSED" | "NOT_IN_ROOM" | "GAME_ERROR";

export type DescribedError = {
  // Set when the server explained the problem (its message is then meant for the player)
  code: GameErrorCode | null;
  message: string;
};

const GAME_CODES = new Set<unknown>(["ROOM_CLOSED", "NOT_IN_ROOM", "GAME_ERROR"]);

export const CONNECTION_MESSAGE = "Couldn't reach the game. Check your connection and try again.";
const SERVER_MESSAGE = "Something went wrong on our end. Please try again.";

// What to tell the player about a failed request
export function describeError(error: unknown): DescribedError {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const code = first?.extensions?.code;
    if (first && GAME_CODES.has(code)) {
      return { code: code as GameErrorCode, message: first.message };
    }
    return { code: null, message: SERVER_MESSAGE };
  }
  // The server answered, but not with a usable response (it's down or restarting)
  if (ServerError.is(error) || ServerParseError.is(error)) {
    return { code: null, message: SERVER_MESSAGE };
  }
  // No answer at all: offline, or the server can't be reached
  return { code: null, message: CONNECTION_MESSAGE };
}
