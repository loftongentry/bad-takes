export type RoomStatus = "LOBBY" | "PROMPT_ENTRY" | "DEFENSE" | "VOTING" | "RESULTS";

export type RoomSettings = {
  lobbyName: string
  rounds: number
  playerLimit: number
  timeLimit: number
}

export type Player = {
  id: string
  name: string
  isHost: boolean
  score: number
}

export type Prompt = {
  id: string
  authorId: string
  text: string
}

export type Turn = {
  defenderId: string
  promptId: string
  promptText: string
}

// The shape persisted as JSON in the room hash's "gameState" field
export type StoredGameState = {
  prompts: Prompt[]
  queue: Turn[]
  votes: Record<string, number>
  currentTurn: Turn | null
}

// What clients see: the stored state plus vote info derived from the votes hash
export type GameState = StoredGameState & {
  votesCast?: number
  votedPlayers?: string[]
}

export type Room = {
  id: string
  joinCode: string
  status: RoomStatus
  settings: RoomSettings
  players: Player[]
  gameState: GameState | null
}
