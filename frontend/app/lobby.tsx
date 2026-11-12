// TODO: Add in (potentially) more settings
import { useState } from 'react'
import { ScrollView, TouchableOpacity } from 'react-native'
import { Spinner, Text, View } from 'tamagui'
import { X } from '@tamagui/lucide-icons'
import { Page } from '../src/ui/Page'
import { FormCard } from '../src/ui/FormCard'
import { FormRow } from '../src/ui/FormRow'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { ActionRow } from '../src/ui/ActionRow'
import { COLORS } from '../src/ui/theme'
import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useRoom } from '../src/hooks/useRoom'
import { useRoomActions } from '../src/hooks/useRoomActions'
import type { Player } from '../src/graphql/types'

const MIN_PLAYERS = 2

const LobbyScreen = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const playerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const isHost = useGameSessionStore((s) => s.session?.isHost ?? false)

  const { room, loading, error, refetch } = useRoom(roomId || undefined)
  const { leaveGame, kickPlayer, startGame } = useRoomActions(roomId || undefined)
  const [startLoading, setStartLoading] = useState<boolean>(false)

  // Back buttons below call leaveGame so the server drops this player too; clearing only the
  // local session would leave a ghost player behind that holds up everyone else.
  if (!roomId || !playerId || (!room && loading)) {
    return (
      <Page title="Loading..." onBack={leaveGame}>
        <Spinner />
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Connecting to Lobby...</Text>
      </Page>
    )
  }

  // The request failed (as opposed to the room not existing): stay in the room and let the
  // player retry, instead of treating it as the room being closed
  if (!room && error) {
    return (
      <Page title="Can't Reach the Game" onBack={leaveGame}>
        <Text style={{ textAlign: 'center', marginTop: 20, marginBottom: 20 }}>
          Check your connection, then try again. You’re still in the lobby.
        </Text>
        <ActionRow>
          <PrimaryButton onPress={() => refetch()}>Try Again</PrimaryButton>
        </ActionRow>
      </Page>
    )
  }

  if (!room) {
    return (
      <Page title="Lobby Not Found" onBack={leaveGame}>
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

  const handleKickPlayer = async (playerIdToKick: string) => {
    try {
      await kickPlayer(playerIdToKick)
    } catch (error) {
      console.error('Error kicking player:', error)
      alert('Failed to kick player. Please try again.')
    }
  }

  // Matches the server's rule: with one player there's nobody to vote
  const hasEnoughPlayers = room.players.length >= MIN_PLAYERS

  const subText = `Join Code: ${room.joinCode} \n Writing: ${room.settings.promptTimeLimit}s · Defense: ${room.settings.timeLimit}s`

  return (
    <Page
      title={room.settings.lobbyName || 'Game Lobby'}
      subtitle={subText}
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
                            <X size={16} color={COLORS.light} />
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
        <ActionRow>
          <PrimaryButton disabled={loading || !room || !hasEnoughPlayers} onPress={handleStartGame}>
            {startLoading ? <Spinner /> : 'Start Game'}
          </PrimaryButton>
          {!hasEnoughPlayers ? (
            <Text style={{ color: COLORS.light, opacity: 0.6, textAlign: 'center', marginTop: 10 }}>
              Waiting for at least {MIN_PLAYERS} players to join...
            </Text>
          ) : null}
        </ActionRow>
      ) : null}
    </Page>
  )
}

export default LobbyScreen
