import { useRouter } from "expo-router";
import { useGameSessionStore } from "../state/gameSessionStore";
import { useMutation, useQuery, useSubscription } from "@apollo/client/react";
import { LOBBY_OPS } from "../graphql/lobby";
import { useEffect } from "react";

type Room = {
  id: string;
  joinCode: string;
  status: string;
  settings: {
    lobbyName: string;
    rounds: number;
    playerLimit: number;
    timeLimit: number;
  };
  players: Array<{
    id: string;
    name: string;
    isHost: boolean;
    score: number;
  }>;
  gameState: {
    deadline: string | null;
    votesCast: number;
  } | null;
}

type CreateArgs = {
  hostName: string;
  lobbyName: string;
  rounds: number;
  playerLimit: number;
  timeLimit: number;
};

type CreateRoomResult = {
  createRoom: {
    room: Room;
    hostId: string;
  };
};

type JoinRoomResult = {
  joinRoom: {
    room: Room;
    playerId: string;
  };
};

export function useLobby(roomId?: string) {
  const router = useRouter();
  const { session, setSession, clearSession } = useGameSessionStore();

  const myPlayerId = session?.playerId || null;

  // 1. THE WATCHER
  // This hook constantly watches the Apollo Cache for 'Room:roomId'.
  // If the cache changes (due to a subscription or mutation), 'data' updates automatically.
  const { data, loading, error } = useQuery<{ room: Room }>(
    LOBBY_OPS.GET,
    {
      variables: { roomId },
      skip: !roomId,
      fetchPolicy: "cache-and-network", // Always try to get the latest data
    }
  );

  // 2. THE LISTENER
  // This opens the WebSocket. When a message arrives, it silently updates the Apollo Cache.
  // It doesn't return data itself; it just feeds the 'Watcher' above.
  useSubscription(LOBBY_OPS.SUB, {
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

  // 3. MUTATIONS
  const [createFn] = useMutation<CreateRoomResult>(LOBBY_OPS.CREATE)
  const [joinFn] = useMutation<JoinRoomResult>(LOBBY_OPS.JOIN)
  const [leaveFn] = useMutation(LOBBY_OPS.LEAVE)
  const [kickFn] = useMutation(LOBBY_OPS.KICK)
  const [startFn] = useMutation(LOBBY_OPS.START)

  return {
    room,
    loading,
    error,

    // Actions
    createGame: async (args: CreateArgs) => {
      const res = await createFn({ variables: args });
      if (!res.data) {
        throw new Error("Failed to create room");
      }

      const { room, hostId } = res.data.createRoom;

      setSession({
        roomId: room.id,
        joinCode: room.joinCode,
        playerId: hostId,
        isHost: true,
      });

      return room;
    },

    joinGame: async (code: string, playerName: string) => {
      const res = await joinFn({ variables: { code, playerName } });
      if (!res.data) {
        throw new Error("Failed to join room");
      }

      const { room, playerId } = res.data.joinRoom;

      setSession({
        roomId: room.id,
        joinCode: room.joinCode,
        playerId,
        isHost: false,
      });

      return room;
    },

    leaveGame: async () => {
      if (roomId && myPlayerId) {
        try {
          await leaveFn({ variables: { roomId, playerId: myPlayerId } });
        } catch (error) {
          console.error("Error leaving room:", error);
        } finally {
          clearSession();
          router.dismissAll();
        }
      }
    },

    kickPlayer: async (playerId: string) => {
      if (!roomId) return;
      await kickFn({ variables: { roomId, playerId } });
    },

    startGame: async () => {
      if (!roomId) return;
      await startFn({ variables: { roomId } });
    },
  }
}