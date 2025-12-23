import { useMutation } from '@apollo/client/react'
import { KICK_PLAYER } from '../operations/room'

export function useKickPlayer() {
  const [mutate, { loading }] = useMutation(KICK_PLAYER)

  async function kickPlayer(roomId: string, playerId: string) {
    await mutate({ variables: { roomId, playerId } })
  }

  return { kickPlayer, kicking: loading }
}
