import { Text, View, Progress } from 'tamagui'
import { Page } from '../src/ui/Page'
import { COLORS } from '../src/ui/theme'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { PromptCard, PromptText } from '../src/ui/PromptCard'
import { SpinnerMessage } from '../src/ui/SpinnerMessage'
import { ActionRow } from '../src/ui/ActionRow'
import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useRoom } from '../src/hooks/useRoom'
import { useRoomActions } from '../src/hooks/useRoomActions'
import { useStatusRedirect } from '../src/hooks/useStatusRedirect'
import { useDefenseTimer } from '../src/hooks/useDefenseTimer'

const PREP_TIME = 5

const Defense = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const { room } = useRoom(roomId || undefined)
  const { endTurn } = useRoomActions(roomId || undefined)

  const currentTurn = room?.gameState?.currentTurn
  const isMe = currentTurn?.defenderId === myPlayerId
  const isHost = room?.players.find(p => p.id === myPlayerId)?.isHost
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Unknown'

  const DEFEND_TIME = room?.settings.timeLimit || 60

  useStatusRedirect(room?.status, { VOTING: '/voting' })

  // The host's client is the one that ends the turn when time runs out
  const { phase, timeLeft, maxTime } = useDefenseTimer(PREP_TIME, DEFEND_TIME, () => {
    if (isHost) {
      endTurn()
    }
  })

  if (!currentTurn) {
    return (
      <Page
        title="Loading..."
        showBack={false}
      >
        <SpinnerMessage>Preparing the next turn...</SpinnerMessage>
      </Page>
    )
  }

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
            backgroundColor: (phase === 'DEFEND' && timeLeft < 10) ? COLORS.danger : COLORS.dark
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
      <PromptCard>
        <PromptText>{currentTurn.promptText}</PromptText>
      </PromptCard>

      {isMe && phase === 'DEFEND' && (
        <ActionRow>
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
        </ActionRow>
      )}
    </Page>
  )
}

export default Defense
