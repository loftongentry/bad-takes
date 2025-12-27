import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Text, Input, View } from 'tamagui'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { RoomCodeInput } from '../src/ui/RoomCodeInput'
import { Page } from '../src/ui/Page'
import { COLORS } from '../src/ui/theme'
import { useLobby } from '../src/hooks/useLobby'

function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
}) {
  return (
    <View style={{ width: '100%', maxWidth: 340 }}>
      <Text
        style={{
          color: COLORS.text,
          fontSize: 18,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {label}
      </Text>

      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        autoCorrect={false}
        style={{
          width: '100%',
          backgroundColor: 'transparent',
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingVertical: 0,
          color: COLORS.text,
          fontSize: 18,
          fontWeight: '800',
        }}
      />
    </View>
  )
}

export default function JoinScreen() {
  const router = useRouter()
  const { joinGame, loading } = useLobby()
  const [roomCode, setRoomCode] = useState<string>('')
  const [yourName, setYourName] = useState<string>('')

  const canJoin = roomCode.length === 5 && yourName.trim().length > 0

  const handleJoinLobby = async () => {
    try {
      await joinGame(
        roomCode,
        yourName
      );
      
      router.push(`/lobby`);
    } catch (error) {
      console.error('Error joining lobby:', error)
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

      <LabeledField
        label="Your Name"
        value={yourName}
        onChangeText={setYourName}
        placeholder="Enter name"
      />

      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <PrimaryButton
          onPress={handleJoinLobby}
          disabled={!canJoin}
          invert
        >
          Join
        </PrimaryButton>
      </View>
    </Page>
  )
}
