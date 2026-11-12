import { useEffect } from "react";
import { usePathname, useRouter } from "expo-router";
import { useQuery, useSubscription } from "@apollo/client/react";
import { useGameSessionStore } from "../state/gameSessionStore";
import { ROOM_OPS } from "../graphql/operations";
import type { Room } from "../graphql/types";

// The screen for each phase of the game. The server decides the phase; every in-game screen
// follows it from here, so any change (including the game ending early because players left)
// moves every player to the right screen, whichever screen they're on.
const SCREEN_FOR_STATUS: Record<string, string> = {
  LOBBY: "/lobby",
  PROMPT_ENTRY: "/prompt-entry",
  DEFENSE: "/defense",
  VOTING: "/voting",
  RESULTS: "/results",
};

// Live view of a room. Keeps the player on the screen for the room's current phase, and sends
// them home if the room closes or they get kicked.
export function useRoom(roomId?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, clearSession } = useGameSessionStore();

  const myPlayerId = session?.playerId || null;

  // 1. THE WATCHER
  // This hook constantly watches the Apollo Cache for 'Room:roomId'.
  // If the cache changes (due to a subscription or mutation), 'data' updates automatically.
  const { data, loading, error } = useQuery<{ room: Room }>(
    ROOM_OPS.GET,
    {
      variables: { roomId },
      skip: !roomId,
      fetchPolicy: "cache-and-network", // Always try to get the latest data
    }
  );

  // 2. THE LISTENER
  // This opens the WebSocket. When a message arrives, it updates the Apollo Cache, which feeds the
  // 'Watcher' above. The one exception is the server's "room closed" message (room: null): Apollo
  // stores that separately from the query's data, so the Watcher never sees it and we check it here.
  const { data: subData } = useSubscription<{ room: Room | null }>(ROOM_OPS.SUB, {
    variables: { roomId },
    skip: !roomId,
  });
  const roomClosed = subData?.room === null;

  const room = data?.room || null;

  useEffect(() => {
    // 1. Safety check: Don't run if we are still loading or have no room ID
    if (!roomId || loading) return;

    // 2. Define the navigation logic
    const handleExit = () => {
      clearSession();
      // Small timeout ensures we aren't mid-render when we navigate. Checked inside the timeout
      // because leaveGame may have already navigated home by the time it runs.
      setTimeout(() => {
        if (router.canGoBack()) {
          router.dismissAll();
        }
      }, 0);
    };

    // Room was closed: the server said so, or the room no longer exists
    if (roomClosed || room === null) {
      handleExit();
      return;
    }

    // I was kicked (I am no longer in the player list)
    if (room && myPlayerId) {
      const amInRoom = room.players.some((p) => p.id === myPlayerId);
      if (!amInRoom) {
        handleExit();
      }
    }
  }, [room, roomClosed, loading, myPlayerId, roomId]);

  // Follow the room to the screen for its current phase
  const status = room?.status;
  useEffect(() => {
    const target = status ? SCREEN_FOR_STATUS[status] : undefined;
    if (target && pathname !== target) {
      router.replace(target);
    }
  }, [status, pathname]);

  return { room, loading, error };
}
