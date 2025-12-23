import { useMutation } from "@apollo/client/react";
import { JOIN_ROOM, JoinRoomData, JoinRoomVars } from "../operations/joinRoom";
import { useGameSessionStore } from "../../state/gameSessionStore";

export function useJoinRoom() {
  const setSession = useGameSessionStore((state) => state.setSession);

  const [mutate, { loading, error }] = useMutation<JoinRoomData, JoinRoomVars>(JOIN_ROOM)

  async function joinRoom(vars: JoinRoomVars) {
    const res = await mutate({ variables: vars });
    const payload = res.data?.joinRoom;

    if (!payload) {
      throw new Error("Failed to join room");
    }

    setSession({
      roomId: payload.room.id,
      joinCode: payload.room.joinCode,
      playerId: payload.playerId,
      isHost: false,
    });

    return payload;
  }
  return { joinRoom, loading, errorMessage: error?.message ?? null };
}