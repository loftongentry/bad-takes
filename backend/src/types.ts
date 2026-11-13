export type RoomStatus = "LOBBY" | "PROMPT_ENTRY" | "DEFENSE" | "VOTING" | "RESULTS";

export type RoomSettings = {
  lobbyName: string;
  rounds: number;
  playerLimit: number;
  timeLimit: number;
  // Seconds players get to write their take
  promptTimeLimit: number;
  // Seconds players get to vote on each defense
  voteTimeLimit: number;
};

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

export type Prompt = {
  id: string;
  authorId: string;
  text: string;
};

export type Turn = {
  defenderId: string;
  promptId: string;
  promptText: string;
};

// The shape persisted as JSON in the room hash's "gameState" field
export type StoredGameState = {
  // Which round this is, from 1 (states saved before rounds existed have none: round 1)
  round?: number;
  prompts: Prompt[];
  queue: Turn[];
  currentTurn: Turn | null;
  // When the current turn's defense ends (ISO time, including the prep countdown)
  deadline: string | null;
};

// What clients see: the stored state plus who has voted / written a take, from the votes and
// prompts hashes
export type GameState = StoredGameState & {
  votedPlayerIds?: string[];
  votesCast?: number;
  submittedPlayerIds?: string[];
  submittedPromptsCount?: number;
};

export type Room = {
  id: string;
  joinCode: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Player[];
  gameState: GameState | null;
};
