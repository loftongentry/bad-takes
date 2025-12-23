import { useEffect } from 'react'
import { useSubscription } from '@apollo/client/react'
import { ROOM_CLOSED, RoomClosedData, RoomClosedVars } from '../operations/closeRoom'

export function useRoomClosed(roomId: string | null, onClosed: () => void) {
  const { data, error } = useSubscription<RoomClosedData, RoomClosedVars>(ROOM_CLOSED, {
    variables: roomId ? { roomId } : (undefined as any),
    skip: !roomId,
  })

  useEffect(() => {
    if (error) {
      console.log('roomClosed subscription error', error)
    }
  }, [error])

  useEffect(() => {
    if (data?.roomClosed) {
      onClosed()
    }
  }, [data, onClosed])

  return {
    closedRoomId: data?.roomClosed ?? null,
    error,
  }
}
