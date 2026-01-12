// TODO: Instead of just showing a spinner after voting, show the list of players, with an indicator of who has voted and who hasn't.
import { useRouter } from "expo-router"
import { useGameSessionStore } from "../src/state/gameSessionStore"
import { useLobby } from "../src/hooks/useLobby"
import { useEffect, useState } from "react"
import { Page } from "../src/ui/Page"
import { View, Text, Spinner, Card, XStack } from "tamagui"
import { COLORS } from "../src/ui/theme"
import { TouchableOpacity } from "react-native"
import { ThumbsUp, ThumbsDown } from '@tamagui/lucide-icons'

const VoteButton = ({ icon, color, onPress, disabled }: any) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={disabled}
  >
    <View
      style={{
        backgroundColor: color,
        width: 140,
        height: 140,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: color,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
      }}
    >
      {icon}
    </View>
  </TouchableOpacity>
)

const Voting = () => {
  const router = useRouter()
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)

  const { room, submitVote } = useLobby(roomId || undefined)

  const [hasVoted, setHasVoted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const currentTurn = room?.gameState?.currentTurn
  const isDefender = currentTurn?.defenderId === myPlayerId
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Defendant'

  useEffect(() => {
    if (room?.status === 'DEFENSE') {
      router.replace('/defense')
    } else if (room?.status === 'RESULTS') {
      router.replace('/results')
    }
  }, [room?.status])

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
    return (
      <Page
        title="Judgement Time"
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
          }}>
          <Text
            style={{
              fontSize: 30,
              marginTop: 20,
              color: COLORS.light,
              marginBottom: 20,
            }}
          >
            The jury is deciding...
          </Text>
          <Spinner size="large" />
        </View>
      </Page>
    )
  }

  if (hasVoted) {
    return (
      <Page
        title="Vote Locked In"
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
            Waiting for others to vote...
          </Text>
          <Spinner size="large" />
        </View>
      </Page>
    )
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

        <Card
          style={{
            width: '100%',
            maxWidth: 320,
            minHeight: 340,
            paddingVertical: 20,
            paddingHorizontal: 20,
            borderRadius: 18,
            backgroundColor: COLORS.light,
          }}
          bordered
        >
          <Text
            unstyled
            style={{
              flex: 1,
              color: COLORS.dark,
              fontSize: 18,
              fontWeight: '600',
              minHeight: 200,
              textAlignVertical: 'top',
              height: '100%',
              width: '100%',
            }}
          >
            {currentTurn?.promptText}
          </Text>
        </Card>

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
            color="#FF4500"
            onPress={() => handleVote(-1)}
            disabled={loading}
          />

          {/* GOOD BUTTON (+1) */}
          <VoteButton
            icon={<ThumbsUp size={32} color="#fff" />}
            color="#4CAF50"
            onPress={() => handleVote(1)}
            disabled={loading}
          />
        </XStack>
      </View>
    </Page>
  )
}

export default Voting