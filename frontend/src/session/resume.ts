import { apolloClient } from "../graphql/client";
import { ROOM_OPS } from "../graphql/operations";
import type { Room } from "../graphql/types";
import { SCREEN_FOR_STATUS } from "../hooks/useRoom";
import { useGameSessionStore } from "../state/gameSessionStore";

// Picking a game back up after the app was closed (or the web page refreshed) on the Home screen.
// The launch screen stays up while the root layout calls checkForGameToResume; Home then calls
// takeGameToResume and goes straight to the game.

// Long enough for a slow connection, short enough that a dead server doesn't hold the launch
// screen up for long
const CHECK_TIMEOUT_MS = 4000;

let gameToResume: string | null = null;

// Asks the server whether the saved game is still going with this player in it. If so, remembers
// its screen for Home. If the game is over or the player was removed, forgets the saved session.
// If the server can't be reached, keeps it to try again next launch.
export async function checkForGameToResume() {
  const session = useGameSessionStore.getState().session;
  if (!session) {
    return;
  }
  try {
    const { data } = await Promise.race([
      apolloClient.query<{ room: Room | null }>({
        query: ROOM_OPS.GET,
        variables: { roomId: session.roomId },
        fetchPolicy: "network-only",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out")), CHECK_TIMEOUT_MS),
      ),
    ]);
    const room = data?.room;
    if (room && room.players.some((p) => p.id === session.playerId)) {
      gameToResume = SCREEN_FOR_STATUS[room.status];
    } else {
      useGameSessionStore.getState().clearSession();
    }
  } catch (error) {
    console.warn("Couldn't check on the saved game", error);
  }
}

export const hasGameToResume = () => gameToResume !== null;

// The screen to resume on, once (null if there's nothing to resume)
export function takeGameToResume() {
  const target = gameToResume;
  gameToResume = null;
  // Leaving in the meantime drops the session; don't resume a game the player has left
  return target && useGameSessionStore.getState().session ? target : null;
}
