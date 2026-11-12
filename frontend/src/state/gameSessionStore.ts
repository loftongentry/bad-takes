// TODO: Persist user sessions
import { create } from 'zustand'

export type GameSession = {
  roomId: string
  joinCode: string
  // Public: every player sees everyone's id. Used to recognize "me" in the room data.
  playerId: string
  // Secret: proves to the server that requests come from this player. Never share or display it.
  playerToken: string
  isHost: boolean
}

type GameSessionState = {
  session: GameSession | null
  setSession: (session: GameSession) => void
  clearSession: () => void
}

export const useGameSessionStore = create<GameSessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}))
