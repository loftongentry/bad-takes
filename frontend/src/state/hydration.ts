import { useSyncExternalStore } from "react";

type PersistedStore = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

// True once a saved (zustand persist) store has been read back from the device
export const useHydrated = (store: PersistedStore) =>
  useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
  );
