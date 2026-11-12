import { Text, View, Progress } from 'tamagui'
import { Page } from '../src/ui/Page'
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu"
import { COLORS } from '../src/ui/theme'
import { PrimaryButton } from '../src/ui/PrimaryButton'
import { PromptCard, PromptText } from '../src/ui/PromptCard'
import { SpinnerMessage } from '../src/ui/SpinnerMessage'
import { ActionRow } from '../src/ui/ActionRow'
import { useGameSessionStore } from '../src/state/gameSessionStore'
import { useRoom } from '../src/hooks/useRoom'
import { useRoomActions } from '../src/hooks/useRoomActions'
import { useDefenseTimer } from '../src/hooks/useDefenseTimer'

// Must match PREP_SECONDS in backend/src/game/turns.ts (the server's deadline includes it)
const PREP_TIME = 5

const Defense = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)
  const { room } = useRoom(roomId || undefined)
  const { endTurn } = useRoomActions(roomId || undefined)

  const currentTurn = room?.gameState?.currentTurn
  const isMe = currentTurn?.defenderId === myPlayerId
  const defenderName = room?.players.find(p => p.id === currentTurn?.defenderId)?.name || 'Unknown'

  const DEFEND_TIME = room?.settings.timeLimit || 60

  // Counts down to the server's deadline; the server moves everyone to voting when it passes
  const { phase, timeLeft, maxTime } = useDefenseTimer(room?.gameState?.deadline, PREP_TIME, DEFEND_TIME)

  if (!currentTurn) {
    return (
      <Page
        headerRight={<HostPlayersMenu room={room} />}
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
      headerRight={<HostPlayersMenu room={room} />}
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
