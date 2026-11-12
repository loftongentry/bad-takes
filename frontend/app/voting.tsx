// TODO: Instead of just showing a spinner after voting, show the list of players, with an indicator of who has voted and who hasn't.
import { useState } from "react"
import { View, Text, Spinner, XStack } from "tamagui"
import { ThumbsUp, ThumbsDown } from '@tamagui/lucide-icons'
import { Page } from "../src/ui/Page"
import { COLORS } from "../src/ui/theme"
import { PromptCard, PromptText } from "../src/ui/PromptCard"
import { VoteButton } from "../src/ui/VoteButton"
import { useGameSessionStore } from "../src/state/gameSessionStore"
import { useRoom } from "../src/hooks/useRoom"
import { useRoomActions } from "../src/hooks/useRoomActions"
import { useStatusRedirect } from "../src/hooks/useStatusRedirect"

// Shown to the defender while the jury votes, and to voters after they've voted
const WaitingPage = ({ title, message, onBack }: { title: string; message: string; onBack: () => void }) => (
  <Page
    title={title}
    onBack={onBack}
  >
    <View
      style={{
        flex: 1,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 30,
          marginTop: 20,
          color: COLORS.light,
          marginBottom: 20,
        }}
      >
        {message}
      </Text>
      <Spinner size="large" />
    </View>
  </Page>
)

const Voting = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)

  const { room } = useRoom(roomId || undefined)
  const { leaveGame, submitVote } = useRoomActions(roomId || undefined)

  const [hasVoted, setHasVoted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const currentTurn = room?.gameState?.currentTurn
  const isDefender = currentTurn?.defenderId === myPlayerId
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Defendant'

  useStatusRedirect(room?.status, { DEFENSE: '/defense', RESULTS: '/results' })

  const handleVote = async (value: number) => {
    setLoading(true)
    try {
      await submitVote(value)
      setHasVoted(true)
    } catch (error) {
      console.error("Failed to submit vote:", error)
      alert("Failed to submit vote. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (isDefender) {
    return <WaitingPage title="Judgement Time" message="The jury is deciding..." onBack={leaveGame} />
  }

  if (hasVoted) {
    return <WaitingPage title="Vote Locked In" message="Waiting for others to vote..." onBack={leaveGame} />
  }

  return (
    <Page
      title="Cast Your Vote"
      showBack={false}
    >
      <View
        style={{
          width: '100%',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            marginBottom: 10,
            fontSize: 22,
          }}
        >
          Did <Text style={{ fontWeight: 'bold' }}>{defenderName}</Text> defend this well?
        </Text>

        <PromptCard>
          <PromptText>{currentTurn?.promptText}</PromptText>
        </PromptCard>

        <XStack
          style={{
            justifyContent: 'center',
            width: '100%',
            gap: 20,
            marginTop: 30,
          }}
        >
          {/* BAD BUTTON (-1) */}
          <VoteButton
            icon={<ThumbsDown size={32} color="#fff" />}
            color={COLORS.danger}
            onPress={() => handleVote(-1)}
            disabled={loading}
          />

          {/* GOOD BUTTON (+1) */}
          <VoteButton
            icon={<ThumbsUp size={32} color="#fff" />}
            color={COLORS.success}
            onPress={() => handleVote(1)}
            disabled={loading}
          />
        </XStack>
      </View>
    </Page>
  )
}

export default Voting
