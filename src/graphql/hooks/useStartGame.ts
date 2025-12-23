import { useMutation } from '@apollo/client/react'
import { START_GAME } from '../operations/room'

export function useStartGame() {
  const [mutate, { loading }] = useMutation(START_GAME)

  async function startGame(roomId: string) {
    await mutate({ variables: { roomId } })
  }

  return { startGame, starting: loading }
}
