import { Card, Text, View, Spinner, Progress } from 'tamagui'
import { Page } from '../src/ui/Page'
import { COLORS } from '../src/ui/theme'
import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useLobby } from '../src/hooks/useLobby'
import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { PrimaryButton } from '../src/ui/PrimaryButton'

const Defense = () => {
  const router = useRouter()
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const { room, endTurn } = useLobby(roomId || undefined)

  const currentTurn = room?.gameState?.currentTurn
  const isMe = currentTurn?.defenderId === myPlayerId
  const isHost = room?.players.find(p => p.id === myPlayerId)?.isHost
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Unknown'

  const PREP_TIME = 5
  const DEFEND_TIME = room?.settings.timeLimit || 60

  const [timeLeft, setTimeLeft] = useState<number>(PREP_TIME)
  const [phase, setPhase] = useState<'PREP' | 'DEFEND'>('PREP')

  useEffect(() => {
    if (room?.status === 'VOTING') {
      router.replace('/voting')
    }
  }, [room?.status])

  useEffect(() => {
    if (timeLeft <= 0) {
      if (phase === 'PREP') {
        setPhase('DEFEND')
        setTimeLeft(DEFEND_TIME)
      } else if (phase === 'DEFEND') {
        if (isHost) {
          endTurn()
        }
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, phase, isHost, endTurn])

  if (!currentTurn) {
    return (
      <Page
        title="Loading..."
        showBack={false}
      >
        <View
          style={{
            flex: 1,
            paddingHorizontal: 40
          }}>
          <Spinner
            size="large"
            color={COLORS.light}
            style={{
              marginBottom: 20,
            }}
          />
          <Text
            style={{
              color: COLORS.light,
              fontSize: 18,
              textAlign: 'center',
              opacity: 0.8,
              lineHeight: 28
            }}
          >
            Preparing the next turn...
          </Text>
        </View>
      </Page>
    )
  }

  const maxTime = phase === 'PREP' ? PREP_TIME : DEFEND_TIME
  const progressValue = Math.floor(100 - ((timeLeft / maxTime) * 100))
  const headerText = phase === 'PREP' ? "Get Ready!" : (isMe ? "DEFEND THIS!" : "Listen Up!")

  return (
    <Page
      title={headerText}
      showBack={false}
    >
      <Progress
        value={progressValue}
        style={{
          width: '100%',
          maxWidth: 320,
          marginBottom: 20,
          backgroundColor: COLORS.light
        }}
      >
        <Progress.Indicator
          animation='bouncy'
          style={{
            backgroundColor: (phase === 'DEFEND' && timeLeft < 10) ? '#FF4500' : COLORS.dark
          }}
        />
      </Progress>
      <View style={{ marginBottom: 20, alignItems: 'center' }}>
        {isMe ? (
          <Text style={{ color: COLORS.light, fontSize: 16, opacity: 0.8, marginBottom: 8 }}>
            You are defending:
          </Text>
        ) : (
          <Text style={{ color: COLORS.light, fontSize: 16, opacity: 0.8, marginBottom: 8 }}>
            <Text style={{ fontWeight: '800' }}>{defenderName}</Text> is defending:
          </Text>
        )}
      </View>
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
          {currentTurn.promptText}
        </Text>
      </Card>

      {isMe && phase === 'DEFEND' && (
        <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
          <PrimaryButton
            onPress={() => endTurn()}
          >
            <Text
              style={{
                color: COLORS.light,
                fontWeight: '700',
                fontSize: 16,
              }}
            >
              End Defense
            </Text>
          </PrimaryButton>
        </View>
      )}
    </Page>
  )
}

export default Defense