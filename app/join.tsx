import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { Button, Card, Input, Text, View } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons'
import { TextInput, Pressable } from 'react-native'
import { useJoinRoom } from '../src/graphql/hooks/useJoinRoom'

const TEXT_COLOR = '#D0CCC3'
const SECONDARY_TEXT_COLOR = '#A8A49D'

const CODE_LENGTH = 5

function RoomCodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  const inputRef = useRef<TextInput>(null)

  const sanitized = useMemo(() => {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
  }, [value])

  // Keep parent state normalized
  if (sanitized !== value) {
    onChange(sanitized)
  }

  const boxes = Array.from({ length: CODE_LENGTH }).map((_, i) => sanitized[i] ?? '')
  const isComplete = sanitized.length === CODE_LENGTH

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ width: '100%' }}>
      <View style={{ width: '100%', alignItems: 'center' }}>
        {/* Boxes */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {boxes.map((ch, idx) => {
            const isActive = !isComplete && idx === sanitized.length
            return (
              <View
                key={idx}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isActive ? TEXT_COLOR : 'rgba(208,204,195,0.35)',
                  backgroundColor: 'rgba(0,0,0,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: TEXT_COLOR,
                    fontSize: 22,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  {ch}
                </Text>
              </View>
            )
          })}
        </View>

        {/* Hidden input that actually captures typing/paste/backspace */}
        <TextInput
          ref={inputRef}
          value={sanitized}
          onChangeText={onChange}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          textContentType="oneTimeCode"
          maxLength={CODE_LENGTH}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 1,
            height: 1,
          }}
        />
      </View>
    </Pressable>
  )
}

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
          color: TEXT_COLOR,
          fontSize: 18,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 10,
        }}
      >
        {label}
      </Text>

      <Card
        bordered
        style={{
          width: '100%',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: 'rgba(0,0,0,0.10)',
        }}
      >
        <Input
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={SECONDARY_TEXT_COLOR}
          autoCorrect={false}
          style={{
            width: '100%',
            backgroundColor: 'transparent',
            borderWidth: 0,
            paddingHorizontal: 0,
            paddingVertical: 0,
            color: TEXT_COLOR,
            fontSize: 18,
            fontWeight: '800',
          }}
        />
      </Card>
    </View>
  )
}

export default function JoinScreen() {
  const router = useRouter()
  const { joinRoom, loading, errorMessage } = useJoinRoom();
  const [roomCode, setRoomCode] = useState<string>('')
  const [yourName, setYourName] = useState<string>('')

  const canJoin = roomCode.length === CODE_LENGTH && yourName.trim().length > 0

  async function handleJoinLobby() {
    try {
      const payload = await joinRoom({
        joinCode: roomCode,
        playerName: yourName.trim(),
      });

      // Navigate to the room screen after successful join
      router.push({
        pathname: `/lobby`,
        params: { roomId: payload.room.id },
      });
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        alignItems: 'center',
        marginTop: 20,
      }}
    >
      {/* Header */}
      <View
        style={{
          width: '100%',
          maxWidth: 340,
          alignSelf: 'center',
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 20,
        }}
      >
        <Button
          bordered
          onPress={() => router.back()}
          style={{
            height: 30,
            width: 30,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 0,
          }}
          icon={<ArrowLeft color={TEXT_COLOR} size={18} />}
        />
        <View style={{ flex: 1 }} />
      </View>
      <Text
        style={{
          color: TEXT_COLOR,
          fontSize: 44,
          fontWeight: '900',
          letterSpacing: -0.5,
          marginBottom: 20,
        }}
      >
        Join Game
      </Text>

      <Text
        style={{
          color: TEXT_COLOR,
          fontSize: 18,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        Room Code
      </Text>

      <View style={{ width: '100%', maxWidth: 340 }}>
        <RoomCodeInput value={roomCode} onChange={setRoomCode} />
      </View>

      {/* Name */}
      <View style={{ height: 26 }} />

      <LabeledField
        label="Your Name"
        value={yourName}
        onChangeText={setYourName}
        placeholder="Enter name"
      />

      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <Button
          bordered
          disabled={!canJoin}
          onPress={handleJoinLobby}
          style={{ height: 58, borderRadius: 14, opacity: canJoin ? 1 : 0.45, }}
        >
          <Text style={{ color: TEXT_COLOR, fontSize: 20, fontWeight: '800' }}>
            Join
          </Text>
        </Button>
      </View>
    </View>
  )
}
