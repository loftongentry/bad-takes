// The game's rules and limits, defined once. The app reads them through the `rules` query
// (see gameRules below) instead of keeping its own copies, and the server enforces them
// because a client can send anything.
import type { RoomSettings } from "../types";
import { GameError } from "./errors";

export const PLAYER_NAME_MAX = 24;
export const LOBBY_NAME_MAX = 40;
export const PROMPT_MAX = 140;

// With one player there's nobody to vote, so a game needs at least two
export const MIN_PLAYERS = 2;

export const ROUNDS = { min: 1, max: 1 }; // multiple rounds aren't supported yet
export const PLAYER_LIMIT = { min: MIN_PLAYERS, max: 20 };
// Defense and writing times in seconds. The minimums are overridable so tests can use very
// short phases.
const TEST_MIN = Number(process.env.MIN_TIME_LIMIT_SECONDS) || 0;
export const TIME_LIMIT = { min: TEST_MIN || 60, max: 300 };
export const PROMPT_TIME_LIMIT = { min: TEST_MIN || 30, max: 180 };

// "Get ready" countdown before each defense; the defense deadline includes it
export const PREP_SECONDS = 5;

// How long players have to vote (the host picks within the range); when it runs out, the votes
// that came in are counted. The default is overridable so tests don't have to wait.
export const VOTE_TIME_LIMIT = { min: TEST_MIN || 15, max: 60 };
export const VOTE_SECONDS = Number(process.env.VOTE_SECONDS) || 30;

// Everything the app needs to know, served by the `rules` query
export function gameRules() {
  return {
    minPlayers: MIN_PLAYERS,
    rounds: ROUNDS,
    playerLimit: PLAYER_LIMIT,
    timeLimit: TIME_LIMIT,
    promptTimeLimit: PROMPT_TIME_LIMIT,
    prepSeconds: PREP_SECONDS,
    voteSeconds: VOTE_SECONDS,
    voteTimeLimit: VOTE_TIME_LIMIT,
    playerNameMaxLength: PLAYER_NAME_MAX,
    lobbyNameMaxLength: LOBBY_NAME_MAX,
    promptMaxLength: PROMPT_MAX,
  };
}

// Trims the text and checks it isn't empty or too long. Returns the trimmed text.
export function cleanText(value: string, label: string, max: number) {
  const text = value.trim();
  if (text.length === 0) {
    throw new GameError(`${label} can't be empty`);
  }
  if (text.length > max) {
    throw new GameError(`${label} must be ${max} characters or fewer`);
  }
  return text;
}

function checkRange(value: number, label: string, { min, max }: { min: number; max: number }) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new GameError(
      min === max ? `${label} must be ${min}` : `${label} must be between ${min} and ${max}`,
    );
  }
}

export function checkSettings(settings: RoomSettings): RoomSettings {
  checkRange(settings.rounds, "Rounds", ROUNDS);
  checkRange(settings.playerLimit, "Player limit", PLAYER_LIMIT);
  checkRange(settings.timeLimit, "Time limit", TIME_LIMIT);
  checkRange(settings.promptTimeLimit, "Writing time", PROMPT_TIME_LIMIT);
  checkRange(settings.voteTimeLimit, "Voting time", VOTE_TIME_LIMIT);
  return { ...settings, lobbyName: cleanText(settings.lobbyName, "Lobby name", LOBBY_NAME_MAX) };
}
