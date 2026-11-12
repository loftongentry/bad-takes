import { useState } from "react"
import { View, Text, ScrollView, Separator, Card } from "tamagui"
import { Crown, RefreshCw } from '@tamagui/lucide-icons'
import { Page } from "../src/ui/Page"
import { PrimaryButton } from "../src/ui/PrimaryButton"
import { COLORS } from "../src/ui/theme"
import { useGameSessionStore } from "../src/state/gameSessionStore"
import { useRoom } from "../src/hooks/useRoom"
import { useRoomActions } from "../src/hooks/useRoomActions"
import { useStatusRedirect } from "../src/hooks/useStatusRedirect"

const Results = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null)

  const { room } = useRoom(roomId || undefined)
  const { leaveGame, resetGame } = useRoomActions(roomId || undefined)
  const [loading, setLoading] = useState(false)

  const isHost = room?.players.find(p => p.id === myPlayerId)?.isHost

  const players = room?.players || []
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const winner = sortedPlayers[0]

  useStatusRedirect(room?.status, { LOBBY: '/lobby' })

  const handlePlayAgain = async () => {
    setLoading(true)
    try {
      await resetGame()
    } catch (e) {
      console.error(e)
      alert("Failed to reset game")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Page
      title="Game Results"
      onBack={leaveGame}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ width: '100%' }}
      >

        {/* WINNER CARD */}
        {winner && (
          <View style={{ alignItems: 'center', marginBottom: 40, marginTop: 10 }}>
            <Crown size={64} color={COLORS.gold} style={{ marginBottom: 10 }} />
            <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.light }}>
              {winner.name}
            </Text>
            <Text style={{ fontSize: 16, color: COLORS.light, opacity: 0.8 }}>
              Grand Champion
            </Text>
            <View
              style={{
                marginTop: 15,
                backgroundColor: COLORS.light,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.dark }}>
                {winner.score} pts
              </Text>
            </View>
          </View>
        )}

        {/* LEADERBOARD */}
        <View style={{ width: '100%', gap: 12 }}>
          {sortedPlayers.map((player, index) => {
            const isWinner = index === 0
            if (isWinner) return null

            return (
              <Card
                key={player.id}
                bordered
                style={{
                  backgroundColor: COLORS.light,
                  padding: 16,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.muted, width: 24 }}>
                    #{index + 1}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.dark }}>
                    {player.name}
                  </Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.dark }}>
                  {player.score}
                </Text>
              </Card>
            )
          })}
        </View>

        <Separator style={{ margin: 20 }} />

        {/* HOST ACTIONS */}
        {isHost ? (
          <View style={{ width: '100%' }}>
            <PrimaryButton onPress={handlePlayAgain} disabled={loading} icon={<RefreshCw size={22} color={COLORS.light} />}>
              {loading ? "Resetting..." : "Play Again"}
            </PrimaryButton>
          </View>
        ) : (
          <Text style={{ textAlign: 'center', color: COLORS.light, opacity: 0.6 }}>
            Waiting for host to restart...
          </Text>
        )}

      </ScrollView>
    </Page>
  )
}

export default Results
