import { useRouter } from 'expo-router'
import { useNavigation } from '@react-navigation/native'
import { ScrollView, TouchableOpacity } from 'react-native'
import { Text, View } from 'tamagui'
import { X } from '@tamagui/lucide-icons'

import { Page } from '../src/ui/Page'
import { FormCard } from '../src/ui/FormCard'
import { FormRow } from '../src/ui/FormRow'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { COLORS } from '../src/ui/theme'

import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useRoom } from '../src/graphql/hooks/useRoom'
import { useLeaveRoom } from '../src/graphql/hooks/useLeaveRoom'
import { useKickPlayer } from '../src/graphql/hooks/useKickPlayer'
import { useStartGame } from '../src/graphql/hooks/useStartGame'
import { useSubscription } from '@apollo/client/react'
import { ROOM_CLOSED } from '../src/graphql/operations/closeRoom'
import { useRoomClosed } from '../src/graphql/hooks/useRoomClosed'

type Player = {
  id: string
  name: string
  isHost: boolean
}

export default function LobbyScreen() {
  const router = useRouter()
  const navigation = useNavigation()

  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const playerId = useGameSessionStore((s) => s.session?.playerId ?? null)

  if (!roomId || !playerId) {
    router.replace('/')
    return null
  }

  const { room, loading } = useRoom(roomId)
  const { leaveRoom } = useLeaveRoom()
  const { kickPlayer } = useKickPlayer()
  const { startGame } = useStartGame()

  const clearSession = useGameSessionStore((s) => s.clearSession)

  useRoomClosed(roomId, () => {
    clearSession()
    navigation.goBack()
  })

  const onBackPress = async () => {
    try {
      if (roomId && playerId) {
        await leaveRoom(roomId, playerId)
      }
    } catch (e) {
      // Ignore errors on leave
    } finally {
      clearSession()
      navigation.goBack()
    }
  }

  if (loading || !room) {
    return (
      <Page title="Lobby" showBack onBack={onBackPress}>
        <Text style={{ color: COLORS.text, opacity: 0.8 }}>
          {/*{error ? error.message : 'Loading...'}*/}
        </Text>
      </Page>
    )
  }

  const me = room?.players?.find((p: any) => p.id === playerId)
  const isHost = !!me?.isHost
  const joinCode = room?.joinCode || ''
  const subtitle = `Join Code: ${joinCode} \n Rounds: ${room.settings.rounds} · Time: ${room.settings.timeLimit} seconds`

  return (
    <Page
      title={room.settings.lobbyName || 'Game Lobby'}
      subtitle={subtitle}
      onBack={onBackPress}
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
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800' }}>
              Players
            </Text>

            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', opacity: 0.75 }}>
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
                              color: COLORS.text,
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
                            onPress={() => kickPlayer(roomId, p.id)}
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
          <PrimaryButton disabled={loading || !room} onPress={() => startGame(roomId)}>
            Start Game
          </PrimaryButton>
        </View>
      ) : null}
    </Page>
  )
}
