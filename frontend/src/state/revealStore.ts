import { create } from "zustand";
import type { TakeReveal } from "../graphql/types";

// The "who wrote it" card (see TakeRevealHost), in rooms that reveal authors. The server puts the
// last take's reveal in the room data when its voting closes; whichever screen the player is on
// then offers it here, and it shows once, for a few seconds.

type RevealState = {
  current: TakeReveal | null;
  dismiss: () => void;
};

export const useRevealStore = create<RevealState>((set) => ({
  current: null,
  dismiss: () => set({ current: null }),
}));

const seen = new Set<string>();

// A reveal older than this is old news (the app was reopened, say), so it isn't shown. Generous,
// since the phone's clock and the server's may differ by a few seconds.
const FRESH_MS = 30_000;

// Whether this reveal hasn't been shown yet and is recent enough to show
export const isNewReveal = (reveal: TakeReveal | null | undefined): reveal is TakeReveal =>
  !!reveal && !seen.has(reveal.id) && Date.now() - Date.parse(reveal.at) < FRESH_MS;

// Shows the reveal for `durationMs`, unless it's already been shown
export function offerReveal(reveal: TakeReveal | null | undefined, durationMs: number) {
  if (!isNewReveal(reveal)) {
    return;
  }
  seen.add(reveal.id);
  useRevealStore.setState({ current: reveal });
  setTimeout(() => {
    if (useRevealStore.getState().current?.id === reveal.id) {
      useRevealStore.getState().dismiss();
    }
  }, durationMs);
}
