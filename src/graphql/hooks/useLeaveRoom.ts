import { useMutation } from '@apollo/client/react'
import { LEAVE_ROOM } from '../operations/room'

export function useLeaveRoom() {
  const [mutate, { loading }] = useMutation(LEAVE_ROOM)

  async function leaveRoom(roomId: string, playerId: string) {
    await mutate({ variables: { roomId, playerId } })
  }

  return { leaveRoom, leaving: loading }
}
