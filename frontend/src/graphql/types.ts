// Hand-written mirrors of the backend GraphQL schema (backend/src/schema.ts)

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
};

export type Room = {
  id: string;
  joinCode: string;
  status: string;
  settings: {
    lobbyName: string;
    rounds: number;
    playerLimit: number;
    timeLimit: number;
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
};

// --- Mutation results ---

export type CreateRoomResult = {
  createRoom: {
    room: Room;
    hostId: string;
  };
};

export type JoinRoomResult = {
  joinRoom: {
    room: Room;
    playerId: string;
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
