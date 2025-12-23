import { useState } from 'react'
import { useRouter } from 'expo-router'
import { View } from 'tamagui'
import { useJoinRoom } from '../src/graphql/hooks/useJoinRoom'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { RoomCodeInput } from '../src/ui/RoomCodeInput'
import { Page } from '../src/ui/Page'
import { TextFieldRow } from '../src/ui/TextFieldRow'

export default function JoinScreen() {
  const router = useRouter()
  const { joinRoom, loading, errorMessage } = useJoinRoom();
  const [roomCode, setRoomCode] = useState<string>('')
  const [yourName, setYourName] = useState<string>('')

  const canJoin = roomCode.length === 5 && yourName.trim().length > 0

  async function handleJoinLobby() {
    try {
      const payload = await joinRoom({
        joinCode: roomCode,
        playerName: yourName.trim(),
      });

      router.push({
        pathname: `/lobby`,
        params: { roomId: payload.room.id },
      });
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  }

  return (
    <Page
      title="Join Game"
      onBack={() => router.back()}
    >
      <View style={{ width: '100%', maxWidth: 340 }}>
        <RoomCodeInput value={roomCode} onChange={setRoomCode} />
      </View>

      <View style={{ height: 26 }} />

      <TextFieldRow
        label="Your Name"
        value={yourName}
        onChangeText={setYourName}
        placeholder="Enter name"
        showDivider={false}
      />

      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <PrimaryButton
          onPress={handleJoinLobby}
          disabled={!canJoin}
          height={56}
          invert
        >
          Join
        </PrimaryButton>
      </View>
    </Page>
  )
}
