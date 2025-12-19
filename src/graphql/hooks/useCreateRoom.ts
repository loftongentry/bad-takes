import { useMutation } from "@apollo/client/react";
import { CREATE_ROOM, CreateRoomData, CreateRoomVars } from "../operations/createRoom";
import { useGameSessionStore } from "../../state/gameSessionStore";

export function useCreateRoom() {
  const setSession = useGameSessionStore((state) => state.setSession);

  const [mutate, { loading, error }] = useMutation<CreateRoomData, CreateRoomVars>(CREATE_ROOM)

  async function createRoom(vars: CreateRoomVars) {
    const res = await mutate({ variables: vars });
    const payload = res.data?.createRoom;

    if (!payload) {
      throw new Error("Failed to create room");
    }

    setSession({
      roomId: payload.room.id,
      joinCode: payload.room.joinCode,
      playerId: payload.hostPlayerId,
      isHost: true,
    });

    return payload;
  }
  return { createRoom, loading, errorMessage: error?.message ?? null };
}