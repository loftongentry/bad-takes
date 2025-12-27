import { useState } from 'react'
import { useRouter } from 'expo-router'
import { View } from 'tamagui'
import { Page } from '../src/ui/Page'
import { StepperRow } from '../src/ui/StepperRow'
import { TextFieldRow } from '../src/ui/TextFieldRow'
import { FormCard } from '../src/ui/FormCard'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { useLobby } from '../src/hooks/useLobby'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export default function CreateScreen() {
  const router = useRouter()
  const { createGame, loading } = useLobby()
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

  const handleCreateLobby = async () => {
    try {
      const room = await createGame({
        hostName: yourName,
        lobbyName,
        rounds,
        playerLimit,
        timeLimit,
      });
      
      router.push(`/lobby`);
    } catch (error) {
      console.error('Error creating lobby:', error)
    }
  }

  return (
    <Page
      title="Create Game"
      onBack={() => router.back()}
    >
      <FormCard>
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
      </FormCard>

      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <PrimaryButton
          onPress={handleCreateLobby}
        >
          Create
        </PrimaryButton>
      </View>
    </Page>
  )
}
