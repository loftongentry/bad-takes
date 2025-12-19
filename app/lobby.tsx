import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { Card, Text, View } from 'tamagui'
import { useGameSessionStore } from '../src/state/gameSessionStore'

const TEXT_COLOR = '#D0CCC3'

export default function LobbyPlaceholder() {
  const { roomId: roomIdParam } = useLocalSearchParams<{ roomId: string }>()
  const session = useGameSessionStore((s) => s.session)

  const roomId = session?.roomId ?? roomIdParam ?? '(missing)'
  const joinCode = session?.joinCode ?? '(missing)'
  const playerId = session?.playerId ?? '(missing)'

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
      <Card bordered style={{ width: '100%', maxWidth: 360, borderRadius: 18, padding: 18 }}>
        <Text style={{ color: TEXT_COLOR, fontSize: 22, fontWeight: '900' }}>
          Lobby Placeholder
        </Text>

        <Text style={{ color: TEXT_COLOR, marginTop: 12 }}>roomId: {roomId}</Text>
        <Text style={{ color: TEXT_COLOR, marginTop: 8 }}>joinCode: {joinCode}</Text>
        <Text style={{ color: TEXT_COLOR, marginTop: 8 }}>playerId: {playerId}</Text>
        <Text style={{ color: TEXT_COLOR, marginTop: 8 }}>
          isHost: {session?.isHost ? 'true' : 'false'}
        </Text>
      </Card>
    </View>
  )
}
