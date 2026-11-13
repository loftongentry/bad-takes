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
  // How long the "who wrote it" card shows after each vote, in rooms that reveal authors
  revealSeconds: number;
  // Voting time, in seconds: the range the host picks from, and the starting value
  voteTimeLimit: Range;
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
    voteTimeLimit: number;
    // Whether everyone finds out who wrote each take once its voting closes
    revealAuthors: boolean;
  };
  players: Player[];
  gameState: {
    // Which round of the game this is, from 1 (out of settings.rounds)
    round: number;
    deadline: string | null;
    // Who has written a take this game, and who has voted on the current turn
    submittedPlayerIds: string[];
    votedPlayerIds: string[];
    votesCast: number;
    submittedPromptsCount: number;
    currentTurn: {
      defenderId: string;
      promptId: string;
      promptText: string;
    };
    // The last take voted on, in rooms that reveal authors
    lastReveal: TakeReveal | null;
  };
};

// Who wrote the take that was just voted on, and how it went
export type TakeReveal = {
  id: string;
  // When voting closed (ISO time)
  at: string;
  promptText: string;
  authorName: string;
  defenderId: string;
  defenderName: string;
  score: number;
  cheers: number;
  boos: number;
};

export type CreateArgs = {
  hostName: string;
  lobbyName: string;
  rounds: number;
  playerLimit: number;
  timeLimit: number;
  promptTimeLimit: number;
  voteTimeLimit: number;
  revealAuthors: boolean;
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
