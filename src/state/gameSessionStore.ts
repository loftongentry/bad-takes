import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session: GameSession) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: 'bad-takes-session',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
)
