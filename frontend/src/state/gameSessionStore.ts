import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type GameSession = {
  roomId: string;
  joinCode: string;
  // Public: every player sees everyone's id. Used to recognize "me" in the room data.
  playerId: string;
  // Secret: proves to the server that requests come from this player. Never share or display it.
  playerToken: string;
  isHost: boolean;
};

type GameSessionState = {
  session: GameSession | null;
  setSession: (session: GameSession) => void;
  clearSession: () => void;
};

// Saved on the device, so a player whose app was closed (or whose browser tab was refreshed)
// can pick up where they left off (see src/session/resume.ts). On the web it's kept per tab
// (sessionStorage survives a refresh, not closing the tab), so several windows of the same
// browser can each be a different player.
const storage = createJSONStorage<{ session: GameSession | null }>(() =>
  Platform.OS === "web" ? window.sessionStorage : AsyncStorage,
);

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "bad-takes-session",
      storage,
      partialize: (s) => ({ session: s.session }),
    },
  ),
);

// True once the saved session (if any) has been read back from storage
export const useSessionHydrated = () =>
  useSyncExternalStore(
    (onChange) => useGameSessionStore.persist.onFinishHydration(onChange),
    () => useGameSessionStore.persist.hasHydrated(),
  );
