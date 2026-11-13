import pino from "pino";
import { GameError } from "./game/errors";

// One logger for the whole server. In production each line is a JSON object (searchable in the
// host's log viewer); in development, pino-pretty prints readable lines instead.
// LOG_LEVEL: "debug" also shows what the game refused (a late vote, a full room); the default,
// "info", shows what happened to rooms; "warn" and "error" only problems.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // "level":"info" rather than "level":30, for searching
  formatters: { level: (label) => ({ level: label }) },
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});

const logged = new WeakSet<object>();

// For a player action that failed. A GameError is the game refusing something, which is normal,
// so it's only a debug line. Anything else is a bug or an outage.
export function logFailure(action: string, error: unknown, fields: Record<string, unknown> = {}) {
  if (error instanceof GameError) {
    logger.debug({ ...fields, action, reason: error.message }, "refused");
  } else {
    logger.error({ ...fields, action, err: error }, "failed");
  }
  if (error !== null && typeof error === "object") {
    logged.add(error);
  }
}

// Whether logFailure has already logged this error (so the request's error handler doesn't
// log it a second time)
export const alreadyLogged = (error: unknown) =>
  error !== null && typeof error === "object" && logged.has(error);
