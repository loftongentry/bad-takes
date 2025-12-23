import { useMutation } from '@apollo/client/react'
import { LEAVE_ROOM, LeaveRoomData, LeaveRoomVars } from '../operations/room'

export function useLeaveRoom() {
  const [mutate, { loading, error }] = useMutation<LeaveRoomData, LeaveRoomVars>(LEAVE_ROOM)

  async function leaveRoom(roomId: string, playerId: string) {
    const res = await mutate({
      variables: {
        roomId,
        playerId,
      },
    })

    const payload = res.data?.leaveRoom
    if (!payload) {
      throw new Error(`Failed to leave room: ${error?.message ?? "No data returned"}`)
    }

    return payload
  }

  return { leaveRoom, leaving: loading, errorMessage: error?.message ?? null }
}
