// Limits on what players can send. The app enforces the same limits in its forms; the server
// checks again because a client can send anything.
import type { RoomSettings } from "../types";

export const PLAYER_NAME_MAX = 24;
export const LOBBY_NAME_MAX = 40;
export const PROMPT_MAX = 140;

export const ROUNDS = { min: 1, max: 1 }; // multiple rounds aren't supported yet
export const PLAYER_LIMIT = { min: 2, max: 20 };
// Defense and writing times in seconds. The minimums are overridable so tests can use very
// short phases.
const TEST_MIN = Number(process.env.MIN_TIME_LIMIT_SECONDS) || 0;
export const TIME_LIMIT = { min: TEST_MIN || 60, max: 300 };
export const PROMPT_TIME_LIMIT = { min: TEST_MIN || 30, max: 180 };

// Trims the text and checks it isn't empty or too long. Returns the trimmed text.
export function cleanText(value: string, label: string, max: number) {
  const text = value.trim();
  if (text.length === 0) {
    throw new Error(`${label} can't be empty`);
  }
  if (text.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer`);
  }
  return text;
}

function checkRange(value: number, label: string, { min, max }: { min: number; max: number }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      min === max ? `${label} must be ${min}` : `${label} must be between ${min} and ${max}`,
    );
  }
}

export function checkSettings(settings: RoomSettings): RoomSettings {
  checkRange(settings.rounds, "Rounds", ROUNDS);
  checkRange(settings.playerLimit, "Player limit", PLAYER_LIMIT);
  checkRange(settings.timeLimit, "Time limit", TIME_LIMIT);
  checkRange(settings.promptTimeLimit, "Writing time", PROMPT_TIME_LIMIT);
  return { ...settings, lobbyName: cleanText(settings.lobbyName, "Lobby name", LOBBY_NAME_MAX) };
}
