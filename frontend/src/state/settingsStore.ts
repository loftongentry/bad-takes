import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Player preferences that should survive closing the app (saved on the device)
type Settings = {
  muted: boolean;
  // Vibration on big moments (a sign slamming down, a stamp landing). Phones only.
  haptics: boolean;
  // The name this player last played under, filled in for them next time
  lastName: string;
  toggleMuted: () => void;
  toggleHaptics: () => void;
  setLastName: (name: string) => void;
};

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      muted: false,
      haptics: true,
      lastName: "",
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      toggleHaptics: () => set((s) => ({ haptics: !s.haptics })),
      setLastName: (lastName) => set({ lastName: lastName.trim() }),
    }),
    {
      name: "bad-takes-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ muted: s.muted, haptics: s.haptics, lastName: s.lastName }),
    },
  ),
);
