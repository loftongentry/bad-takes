import { useRouter } from "expo-router";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { useGameSessionStore } from "../state/gameSessionStore";
import { ROOM_OPS } from "../graphql/operations";
import type {
  CreateArgs,
  CreateRoomResult,
  JoinRoomResult,
  KickPlayerResult,
  ResetGameResult,
  Room,
  SubmitPromptResult,
  SubmitVoteResult,
} from "../graphql/types";

// Wraps an action so a failure is logged under `label`, then rethrown for the screen to handle
const withErrorLog =
  <Args extends unknown[], Result>(label: string, action: (...args: Args) => Promise<Result>) =>
  async (...args: Args): Promise<Result> => {
    try {
      return await action(...args);
    } catch (error) {
      console.error(label, error);
      throw error;
    }
  };

// Every game mutation, bound to the current room and player
export function useRoomActions(roomId?: string) {
  const router = useRouter();
  const client = useApolloClient();
  const { session, setSession, clearSession } = useGameSessionStore();

  // Sent with every action so the server knows who is acting (see GameSession.playerToken)
  const myToken = session?.playerToken || null;

  // Create and join already return the full room, so put it where the lobby's room query
  // looks. The lobby then shows immediately, without a first request that could fail.
  const rememberRoom = (room: Room) => {
    client.writeQuery({ query: ROOM_OPS.GET, variables: { roomId: room.id }, data: { room } });
  };

  const [createFn] = useMutation<CreateRoomResult>(ROOM_OPS.CREATE);
  const [joinFn] = useMutation<JoinRoomResult>(ROOM_OPS.JOIN);
  const [leaveFn] = useMutation(ROOM_OPS.LEAVE);
  const [kickFn] = useMutation<KickPlayerResult>(ROOM_OPS.KICK);
  const [startFn] = useMutation(ROOM_OPS.START);
  const [submitPromptFn] = useMutation<SubmitPromptResult>(ROOM_OPS.SUBMIT_PROMPT);
  const [endTurnFn] = useMutation(ROOM_OPS.END_TURN);
  const [submitVoteFn] = useMutation<SubmitVoteResult>(ROOM_OPS.SUBMIT_VOTE);
  const [resetGameFn] = useMutation<ResetGameResult>(ROOM_OPS.RESET_GAME);

  return {
    createGame: withErrorLog("Error creating room:", async (args: CreateArgs) => {
      const res = await createFn({ variables: args });
      if (!res.data) {
        throw new Error("Failed to create room");
      }

      const { room, hostId, playerToken } = res.data.createRoom;

      rememberRoom(room);
      setSession({
        roomId: room.id,
        joinCode: room.joinCode,
        playerId: hostId,
        playerToken,
        isHost: true,
      });

      return room;
    }),

    joinGame: withErrorLog("Error joining room:", async (code: string, playerName: string) => {
      const res = await joinFn({ variables: { code, playerName } });
      if (!res.data) {
        throw new Error("Failed to join room");
      }
      const { room, playerId, playerToken } = res.data.joinRoom;

      rememberRoom(room);
      setSession({
        roomId: room.id,
        joinCode: room.joinCode,
        playerId,
        playerToken,
        isHost: false,
      });

      return room;
    }),

    leaveGame: async () => {
      // Safety check, just force player back to home if missing data
      if (!roomId || !myToken) {
        clearSession();
        if (router.canGoBack()) {
          router.dismissAll();
        }
        return;
      }

      // This is a fire and forget; we do not wait for errors, as the goal is for the player to leave the room, which these accomplish.
      try {
        await leaveFn({ variables: { roomId, playerToken: myToken } });
      } catch (error) {
        console.warn("Network failed while leaving room (User forced exit):", error);
      } finally {
        clearSession();
        // The room-closed handler in useRoom may have already navigated home
        if (router.canGoBack()) {
          router.dismissAll();
        }
      }
    },

    // Unlike leaveGame, here we do want to know if it failed, as this is the host trying to kick someone.
    kickPlayer: withErrorLog("Error kicking player:", async (playerId: string) => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      const res = await kickFn({ variables: { roomId, playerToken: myToken, playerId } });

      if (res.data?.kickPlayer !== true) {
        throw new Error("Failed to kick player (they may have already left)");
      }
    }),

    startGame: withErrorLog("Error starting game:", async () => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      await startFn({ variables: { roomId, playerToken: myToken } });
    }),

    submitPrompt: withErrorLog("Error submitting prompt:", async (prompt: string) => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      const res = await submitPromptFn({ variables: { roomId, playerToken: myToken, prompt } });

      if (res.data?.submitPrompt === true) {
        return true;
      }

      throw new Error("Server returned false");
    }),

    endTurn: withErrorLog("Failed to end turn:", async () => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      await endTurnFn({ variables: { roomId, playerToken: myToken } });
    }),

    submitVote: withErrorLog("Error submitting vote:", async (value: number) => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      const res = await submitVoteFn({ variables: { roomId, playerToken: myToken, value } });

      if (res.data?.submitVote !== true) {
        throw new Error("Failed to submit vote");
      }
    }),

    resetGame: withErrorLog("Error resetting game:", async () => {
      if (!roomId || !myToken) {
        throw new Error("Missing session data");
      }

      const res = await resetGameFn({ variables: { roomId, playerToken: myToken } });

      if (res.data?.resetGame !== true) {
        throw new Error("Failed to reset game");
      }
    }),
  };
}
