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
    submittedPromptsCount: number;
    currentTurn: {
      defenderId: string;
      promptId: string;
      promptText: string;
    };
  };
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

type KickPlayerResult = {
  kickPlayer: boolean;
};

type SubmitPromptResult = {
  submitPrompt: boolean;
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
  const [kickFn] = useMutation<KickPlayerResult>(LOBBY_OPS.KICK)
  const [startFn] = useMutation(LOBBY_OPS.START)
  const [submitPromptFn] = useMutation<SubmitPromptResult>(LOBBY_OPS.SUBMIT_PROMPT)

  return {
    room,
    loading,
    error,

    // Actions
    createGame: async (args: CreateArgs) => {
      try {
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
      } catch (error) {
        console.error("Error creating room:", error);
        throw error;
      }
    },

    joinGame: async (code: string, playerName: string) => {
      try {
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
      } catch (error) {
        console.error("Error joining room:", error);
        throw error;
      }
    },

    leaveGame: async () => {
      // Safety check, just force player back to home if missing data
      if (!roomId || !myPlayerId) {
        clearSession();
        if (router.canGoBack()) {
          router.dismissAll();
        }
        return;
      }

      // This is a fire and forget; we do not wait for errors, as the goal is for the player to leave the room, which those does accomplish.
      try {
        await leaveFn({ variables: { roomId, playerId: myPlayerId } });
      } catch (error) {
        console.warn("Network failed while leaving room (User forced exit):", error);
      } finally {
        clearSession();
        router.dismissAll();
      }
    },

    kickPlayer: async (playerId: string) => {
      // Unlike leaveGame, here we do want to know if it failed, as this is the host trying to kick someone.
      try {
        if (!roomId) {
          throw new Error("Missing session data");
        }

        const res = await kickFn({ variables: { roomId, playerId } });

        if (res.data?.kickPlayer !== true) {
          throw new Error("Failed to kick player (they may have already left)");
        }

      } catch (error) {
        console.error("Error kicking player:", error);
        throw error;
      }
    },

    startGame: async () => {
      try {
        if (!roomId) {
          throw new Error("Missing session data");
        }

        await startFn({ variables: { roomId } });
      } catch (error) {
        console.error("Error starting game:", error);
        throw error;
      }
    },

    submitPrompt: async (prompt: string) => {
      try {
        if (!roomId || !myPlayerId) {
          throw new Error("Missing session data");
        }

        const res = await submitPromptFn({ variables: { roomId, playerId: myPlayerId, prompt } });

        if(res.data?.submitPrompt === true) {
          return true;
        }

        throw new Error("Server returned false");
      } catch (error) {
        console.error("Error submitting prompt:", error);
        throw error;
      }
    },
  };
}