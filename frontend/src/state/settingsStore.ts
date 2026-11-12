import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Player preferences that should survive closing the app (saved on the device)
type Settings = {
  muted: boolean;
  toggleMuted: () => void;
};

export const useSettingsStore = create<Settings>()(
  persist(
    (set) => ({
      muted: false,
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
    }),
    {
      name: "bad-takes-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ muted: s.muted }),
    },
  ),
);
