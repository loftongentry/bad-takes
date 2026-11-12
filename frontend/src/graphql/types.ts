// Hand-written mirrors of the backend GraphQL schema (backend/src/schema.ts)

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

// The phases of a game, in order (DEFENSE and VOTING repeat once per turn)
export type RoomStatus = "LOBBY" | "PROMPT_ENTRY" | "DEFENSE" | "VOTING" | "RESULTS";

export type Range = { min: number; max: number };

// The game's rules and limits, served by the server so the app never keeps its own copies
export type GameRules = {
  minPlayers: number;
  rounds: Range;
  playerLimit: Range;
  // Defense time, in seconds
  timeLimit: Range;
  // Writing time, in seconds
  promptTimeLimit: Range;
  // "Get ready" countdown before each defense; included in the defense deadline
  prepSeconds: number;
  voteSeconds: number;
  playerNameMaxLength: number;
  lobbyNameMaxLength: number;
  promptMaxLength: number;
};

export type Room = {
  id: string;
  joinCode: string;
  status: RoomStatus;
  settings: {
    lobbyName: string;
    rounds: number;
    playerLimit: number;
    timeLimit: number;
    promptTimeLimit: number;
  };
  players: Player[];
  gameState: {
    deadline: string | null;
    votesCast: number;
    submittedPromptsCount: number;
    currentTurn: {
      defenderId: string;
      promptId: string;
      promptText: string;
    };
  };
};

export type CreateArgs = {
  hostName: string;
  lobbyName: string;
  rounds: number;
  playerLimit: number;
  timeLimit: number;
  promptTimeLimit: number;
};

// --- Mutation results ---

export type CreateRoomResult = {
  createRoom: {
    room: Room;
    hostId: string;
    playerToken: string;
  };
};

export type JoinRoomResult = {
  joinRoom: {
    room: Room;
    playerId: string;
    playerToken: string;
  };
};

export type KickPlayerResult = {
  kickPlayer: boolean;
};

export type SubmitPromptResult = {
  submitPrompt: boolean;
};

export type SubmitVoteResult = {
  submitVote: boolean;
};

export type ResetGameResult = {
  resetGame: boolean;
};
