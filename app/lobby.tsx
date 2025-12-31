import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { ScrollView, TouchableOpacity } from 'react-native'
import { Spinner, Text, View } from 'tamagui'
import { X } from '@tamagui/lucide-icons'
import { Page } from '../src/ui/Page'
import { FormCard } from '../src/ui/FormCard'
import { FormRow } from '../src/ui/FormRow'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { COLORS } from '../src/ui/theme'
import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useLobby } from '../src/hooks/useLobby'

type Player = {
  id: string
  name: string
  isHost: boolean
}

export default function LobbyScreen() {
  const router = useRouter()

  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const playerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const isHost = useGameSessionStore((s) => s.session?.isHost ?? false)
  const clearSession = useGameSessionStore((s) => s.clearSession)

  const { room, leaveGame, kickPlayer, startGame, loading } = useLobby(roomId || undefined)
  const [startLoading, setStartLoading] = useState<boolean>(false)

  useEffect(() => {
    if (room?.status === 'PROMPT_ENTRY') {
      router.replace('/prompt-entry')
    }
  }, [room?.status])

  if (!roomId || !playerId || (!room && loading)) {
    return (
      <Page title="Loading..." onBack={() => router.back()}>
        <Spinner />
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Connecting to Lobby...</Text>
      </Page>
    )
  }

  if (!room) {
    return (
      <Page title="Lobby Not Found" onBack={() => {
        clearSession()
        router.replace('/')
      }}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>The lobby you are trying to join does not exist or has been closed.</Text>
      </Page>
    )
  }

  const handleStartGame = async () => {
    try {
      setStartLoading(true)
      await startGame()
    } catch (error) {
      console.error('Error starting game:', error)
      alert('Failed to start game. Please try again.')
    } finally {
      setStartLoading(false)
    }
  }

  const handleKickPlayer = (playerIdToKick: string) => {
    try {
      kickPlayer(playerIdToKick)
    } catch (error) {
      console.error('Error kicking player:', error)
      alert('Failed to kick player. Please try again.')
    }
  }

  const subtitle = `Join Code: ${room.joinCode} \n Rounds: ${room.settings.rounds} · Time: ${room.settings.timeLimit} seconds`

  return (
    <Page
      title={room.settings.lobbyName || 'Game Lobby'}
      subtitle={subtitle}
      onBack={leaveGame}
    >
      <View style={{ width: '100%', maxWidth: 340 }}>
        <FormCard>
          {/* Header row inside card */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              paddingHorizontal: 18,
            }}
          >
            <Text style={{ color: COLORS.light, fontSize: 16, fontWeight: '800' }}>
              Players
            </Text>

            <Text style={{ color: COLORS.light, fontSize: 14, fontWeight: '700', opacity: 0.75 }}>
              {room.players.length}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: 'rgba(208,204,195,0.18)' }} />

          {/* Scroll list */}
          <ScrollView
            style={{ maxHeight: 320 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {room.players.map((p: Player, idx: number) => {
              const isMe = p.id === playerId
              const labelLeft = `${p.name}${isMe ? ' (you)' : ''}`
              const rightLabel = p.isHost ? 'Host' : ''

              return (
                <View key={p.id}>
                  <FormRow
                    label={labelLeft}
                    showDivider={idx !== room.players.length - 1}
                    right={
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {rightLabel ? (
                          <Text
                            style={{
                              color: COLORS.light,
                              fontSize: 14,
                              fontWeight: '800',
                              opacity: 0.75,
                            }}
                          >
                            {rightLabel}
                          </Text>
                        ) : null}

                        {/* Only host sees remove control; host can't remove self (UI only rule) */}
                        {isHost && !p.isHost && (
                          <TouchableOpacity
                            onPress={() => handleKickPlayer(p.id)}
                            activeOpacity={0.7}
                            style={{
                              height: 28,
                              width: 28,
                              borderRadius: 14,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1,
                              borderColor: 'rgba(208,204,195,0.22)',
                              backgroundColor: 'rgba(0,0,0,0.10)',
                            }}
                          >
                            <X size={16} color={'#D0CCC3'} />
                          </TouchableOpacity>
                        )}
                      </View>
                    }
                  />
                </View>
              )
            })}
          </ScrollView>
        </FormCard>
      </View>

      {isHost ? (
        <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
          <PrimaryButton disabled={loading || !room} onPress={handleStartGame}>
            {startLoading ? <Spinner /> : 'Start Game'}
          </PrimaryButton>
        </View>
      ) : null}
    </Page>
  )
}
