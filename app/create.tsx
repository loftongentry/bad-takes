import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Button, Card, Input, Separator, Text, View } from 'tamagui'
import { Plus, Minus, ArrowLeft } from '@tamagui/lucide-icons'

const TEXT_COLOR = '#D0CCC3'
const SECONDARY_TEXT_COLOR = '#A8A49D'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

function StepperRow({
  label,
  valueText,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  showDivider = true,
}: {
  label: string
  valueText: string
  onDecrement: () => void
  onIncrement: () => void
  decrementDisabled?: boolean
  incrementDisabled?: boolean
  showDivider?: boolean
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 18,
        }}
      >
        <Text style={{ color: TEXT_COLOR, fontSize: 16, fontWeight: '700' }}>
          {label}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center'}}>
          <Button
            bordered
            disabled={decrementDisabled}
            onPress={onDecrement}
            style={{
              height: 34,
              width: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: decrementDisabled ? 0.35 : 1,
            }}
            icon={<Minus />}
          />

          <Text
            style={{
              color: TEXT_COLOR,
              fontSize: 16,
              fontWeight: '800',
              minWidth: 92,
              textAlign: 'center',
            }}
          >
            {valueText}
          </Text>

          <Button
            bordered
            disabled={incrementDisabled}
            onPress={onIncrement}
            style={{
              height: 34,
              width: 44,
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: incrementDisabled ? 0.35 : 1,
            }}
            icon={<Plus />}
          />
        </View>
      </View>

      {showDivider ? <Separator style={{ opacity: 0.22 }} /> : null}
    </View>
  )
}

function TextFieldRow({
  label,
  value,
  onChangeText,
  placeholder,
  showDivider = true,
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  showDivider?: boolean
}) {
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 18,
        }}
      >
        <Text style={{ color: TEXT_COLOR, fontSize: 16, fontWeight: '700' }}>
          {label}
        </Text>

        <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={SECONDARY_TEXT_COLOR}
            style={{
              width: 170,
              backgroundColor: 'transparent',
              borderWidth: 0,
              paddingHorizontal: 0,
              paddingVertical: 0,
              textAlign: 'right',
              color: TEXT_COLOR,
              fontSize: 16,
              fontWeight: '700',
            }}
          />
        </View>
      </View>

      {showDivider ? <Separator style={{ opacity: 0.22 }} /> : null}
    </View>
  )
}

export default function CreateScreen() {
  const router = useRouter()
  const [lobbyName, setLobbyName] = useState<string>('')
  const [rounds, setRounds] = useState<number>(3)
  const [playerLimit, setPlayerLimit] = useState<number>(5)
  const [timeLimit, setTimeLimit] = useState<number>(60)
  const [yourName, setYourName] = useState<string>('')

  // Constraints
  const MIN_ROUNDS = 1
  const MAX_ROUNDS = 5

  const MIN_PLAYERS = 2
  const MAX_PLAYERS = 20

  const STEP_SECONDS = 15
  const MIN_SECONDS = 60
  const MAX_SECONDS = 5 * 60 // 5 Minutes

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
        Create Game
      </Text>

      <Card
        bordered
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 18,
          overflow: 'hidden',
        }}
      >
        {/* Lobby Name moved to top */}
        <TextFieldRow
          label="Lobby Name"
          value={lobbyName}
          onChangeText={setLobbyName}
          placeholder="Lobby Name"
        />

        <StepperRow
          label="Rounds"
          valueText={String(rounds)}
          decrementDisabled={rounds <= MIN_ROUNDS}
          incrementDisabled={rounds >= MAX_ROUNDS}
          onDecrement={() => setRounds((r) => clamp(r - 1, MIN_ROUNDS, MAX_ROUNDS))}
          onIncrement={() => setRounds((r) => clamp(r + 1, MIN_ROUNDS, MAX_ROUNDS))}
        />

        <StepperRow
          label="Player Limit"
          valueText={String(playerLimit)}
          decrementDisabled={playerLimit <= MIN_PLAYERS}
          incrementDisabled={playerLimit >= MAX_PLAYERS}
          onDecrement={() => setPlayerLimit((p) => clamp(p - 1, MIN_PLAYERS, MAX_PLAYERS))}
          onIncrement={() => setPlayerLimit((p) => clamp(p + 1, MIN_PLAYERS, MAX_PLAYERS))}
        />

        <StepperRow
          label="Time Limit"
          valueText={`${timeLimit}s`}
          decrementDisabled={timeLimit <= MIN_SECONDS}
          incrementDisabled={timeLimit >= MAX_SECONDS}
          onDecrement={() =>
            setTimeLimit((s) => clamp(s - STEP_SECONDS, MIN_SECONDS, MAX_SECONDS))
          }
          onIncrement={() =>
            setTimeLimit((s) => clamp(s + STEP_SECONDS, MIN_SECONDS, MAX_SECONDS))
          }
        />

        <TextFieldRow
          label="Your Name"
          value={yourName}
          onChangeText={setYourName}
          placeholder="Enter name"
          showDivider={false}
        />
      </Card>

      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <Button
          bordered
          onPress={() => {
            // TODO: validate + create lobby
          }}
          style={{ height: 58, borderRadius: 14 }}
        >
          <Text style={{ color: TEXT_COLOR, fontSize: 20, fontWeight: '800' }}>
            Create
          </Text>
        </Button>
      </View>
    </View>
  )
}
