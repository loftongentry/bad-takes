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
import { useSecondsLeft } from "../src/hooks/useSecondsLeft"

// "Voting closes in 12s"; the server counts whatever votes are in when it hits zero
const VotingClock = ({ secondsLeft }: { secondsLeft: number | null }) =>
  secondsLeft === null ? null : (
    <Text style={{ color: COLORS.light, opacity: 0.7, fontSize: 16, marginBottom: 10 }}>
      Voting closes in {secondsLeft}s
    </Text>
  )

// Shown to the defender while the jury votes, and to voters after they've voted
const WaitingPage = ({
  title,
  message,
  secondsLeft,
  onBack,
}: {
  title: string
  message: string
  secondsLeft: number | null
  onBack: () => void
}) => (
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
      <VotingClock secondsLeft={secondsLeft} />
      <Spinner size="large" />
    </View>
  </Page>
)

const Voting = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)

  const { room } = useRoom(roomId || undefined)
  const { leaveGame, submitVote } = useRoomActions(roomId || undefined)

  const [loading, setLoading] = useState<boolean>(false)

  const currentTurn = room?.gameState?.currentTurn
  const isDefender = currentTurn?.defenderId === myPlayerId
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Defendant'

  // Each voting round has its own deadline; null until the room is actually voting
  // (before that, the deadline is still the defense's)
  const votingRound = room?.status === 'VOTING' ? room.gameState?.deadline ?? null : null
  const secondsLeft = useSecondsLeft(votingRound)

  // Remember which round this player voted in, so a vote never carries over to the next turn
  // if this screen stays open from one vote to the next
  const [votedRound, setVotedRound] = useState<string | null>(null)
  const hasVoted = votingRound !== null && votedRound === votingRound

  const handleVote = async (value: number) => {
    const round = votingRound
    setLoading(true)
    try {
      await submitVote(value)
      setVotedRound(round)
    } catch (error) {
      console.error("Failed to submit vote:", error)
      alert("Failed to submit vote. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (isDefender) {
    return <WaitingPage title="Judgement Time" message="The jury is deciding..." secondsLeft={secondsLeft} onBack={leaveGame} />
  }

  if (hasVoted) {
    return <WaitingPage title="Vote Locked In" message="Waiting for others to vote..." secondsLeft={secondsLeft} onBack={leaveGame} />
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

        <VotingClock secondsLeft={secondsLeft} />

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
