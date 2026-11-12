import { Button, Dialog, Text, View } from 'tamagui'
import { Users } from '@tamagui/lucide-icons'
import { useGameSessionStore } from '../state/gameSessionStore'
import { useRoomActions } from '../hooks/useRoomActions'
import type { Room } from '../graphql/types'
import { COLORS } from './theme'

// A "Players" button for the host on in-game screens, opening a list where they can remove a
// player mid-game (someone who wandered off or whose phone died). Renders nothing for others.
export const HostPlayersMenu = ({ room }: { room: Room | null }) => {
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const { kickPlayer } = useRoomActions(room?.id)

  const amHost = !!room?.players.find((p) => p.id === myPlayerId)?.isHost
  if (!room || !amHost) {
    return null
  }

  const handleRemove = async (playerId: string) => {
    try {
      await kickPlayer(playerId)
    } catch (error) {
      console.error('Error removing player:', error)
      alert('Failed to remove player. Please try again.')
    }
  }

  return (
    <Dialog modal>
      <Dialog.Trigger asChild>
        <Button
          bordered
          size="$2"
          icon={<Users color={COLORS.light} size={16} />}
          aria-label="Players"
        >
          <Text style={{ color: COLORS.light, fontWeight: '700' }}>Players</Text>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay key="overlay" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} />
        <Dialog.Content bordered style={{ width: '92%', maxWidth: 400, borderRadius: 18, padding: 18, gap: 12 }}>
          <Dialog.Title style={{ color: COLORS.light, fontSize: 22, fontWeight: '900' }}>
            Players
          </Dialog.Title>
          <Text style={{ color: COLORS.light, opacity: 0.75 }}>
            Remove someone who has left or stopped responding so the game can carry on.
          </Text>

          {room.players.map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: COLORS.light, fontSize: 16, fontWeight: '700', flexShrink: 1 }}>
                {p.name}{p.id === myPlayerId ? ' (you)' : ''}
              </Text>
              {p.id !== myPlayerId ? (
                <Button bordered size="$2" onPress={() => handleRemove(p.id)} aria-label={`Remove ${p.name}`}>
                  <Text style={{ color: COLORS.danger, fontWeight: '700' }}>Remove</Text>
                </Button>
              ) : null}
            </View>
          ))}

          <Dialog.Close asChild>
            <Button bordered style={{ marginTop: 6 }}>
              <Text style={{ color: COLORS.light, fontWeight: '800' }}>Close</Text>
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
