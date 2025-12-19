import { create } from 'zustand'

export type GameSession = {
  roomId: string
  joinCode: string
  playerId: string
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
