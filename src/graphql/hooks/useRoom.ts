import { useEffect, useState } from 'react'
import { useQuery, useSubscription } from '@apollo/client/react'
import { ROOM_BY_ID, ROOM_UPDATED, RoomByIdData, RoomByIdVars, RoomUpdatedData, RoomUpdatedVars } from '../operations/room'

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<any | null>(null)

  const q = useQuery<RoomByIdData, RoomByIdVars>(ROOM_BY_ID, {
    variables: { roomId },
    skip: !roomId,
    fetchPolicy: 'network-only',
  })

  const s = useSubscription<RoomUpdatedData, RoomUpdatedVars>(ROOM_UPDATED, {
    variables: { roomId },
    skip: !roomId,
  })

  // initial load
  useEffect(() => {
    if (q.data?.roomById) setRoom(q.data.roomById)
  }, [q.data])

  // live updates
  useEffect(() => {
    if (s.data?.roomUpdated) setRoom(s.data.roomUpdated)
  }, [s.data])

  return { room, loading: q.loading && !room, error: q.error ?? s.error ?? null }
}
