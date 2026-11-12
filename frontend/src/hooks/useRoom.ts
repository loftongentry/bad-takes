import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useQuery, useSubscription } from "@apollo/client/react";
import { useGameSessionStore } from "../state/gameSessionStore";
import { ROOM_OPS } from "../graphql/operations";
import type { Room } from "../graphql/types";

// Live view of a room. Also sends the player home if the room closes or they get kicked.
export function useRoom(roomId?: string) {
  const router = useRouter();
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
  // This opens the WebSocket. When a message arrives, it silently updates the Apollo Cache.
  // It doesn't return data itself; it just feeds the 'Watcher' above.
  useSubscription(ROOM_OPS.SUB, {
    variables: { roomId },
    skip: !roomId,
  });

  const room = data?.room || null;

  useEffect(() => {
    // 1. Safety check: Don't run if we are still loading or have no room ID
    if (!roomId || loading) return;

    // 2. Define the navigation logic
    const handleExit = () => {
      clearSession();
      if (router.canGoBack()) {
        // Small timeout ensures we aren't mid-render when we navigate
        setTimeout(() => {
          router.dismissAll();
        }, 0);
      }
    };

    // Room was closed (data became null after loading finished)
    if (room === null) {
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
  }, [room, loading, myPlayerId, roomId]);

  return { room, loading, error };
}
