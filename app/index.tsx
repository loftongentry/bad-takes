import { Info } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'
import { Button, Card, Separator, Text, View, Dialog, ScrollView } from 'tamagui'

const PRIMARY = '#D0CCC3'
const SECONDARY = '#1B1D1B'

export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 320,
          minHeight: 340,
          paddingVertical: 44,
          paddingHorizontal: 28,
          borderRadius: 18,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        bordered
      >
        <Text
          style={{
            textAlign: 'center',
            color: PRIMARY,
            fontSize: 56,
            fontWeight: '900',
            lineHeight: 56,
          }}
        >
          Bad{'\n'}Takes
        </Text>

        <Text
          style={{
            textAlign: 'center',
            color: PRIMARY,
            marginTop: 20,
            opacity: 0.85,
            fontSize: 16,
          }}
        >
          Defend the indefensible.
        </Text>
      </Card>

      <View
        style={{
          width: '100%',
          maxWidth: 380,
          marginTop: 24,
          gap: 16,
        }}
      >
        <Button
          style={{
            height: 56,
            borderRadius: 14,
          }}
          bordered
          onPress={() => router.push('/create')}
        >
          <Text style={{ color: PRIMARY, fontSize: 20, fontWeight: '800' }}>
            Create Game
          </Text>
        </Button>

        <Button
          style={{
            height: 56,
            borderRadius: 14,
          }}
          bordered
          onPress={() => router.push('/join')}
        >
          <Text style={{ color: PRIMARY, fontSize: 20, fontWeight: '800' }}>
            Join Game
          </Text>
        </Button>

        <Separator style={{ margin: 10 }} />

        <Dialog modal>
          <Dialog.Trigger asChild>
            <Button
              style={{
                height: 58,
                borderRadius: 14,
                backgroundColor: PRIMARY,
              }}
              bordered
              icon={<Info color={SECONDARY} size={24} />}
            >
              <Text style={{ color: SECONDARY, fontSize: 20, fontWeight: '800' }}>
                How to Play
              </Text>
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay
              key="overlay"
              style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
              }}
            />

            <Dialog.Content
              bordered
              style={{
                width: '92%',
                maxWidth: 440,
                borderRadius: 18,
                padding: 18,
              }}
            >
              <Dialog.Title
                style={{ color: PRIMARY, fontSize: 22, fontWeight: '900' }}
              >
                How to Play
              </Dialog.Title>

              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
              >
                <Rule key="1" title="1) Create or join a room">
                  The host creates a game. Everyone else joins using the room code
                </Rule>

                <Rule key="2" title="2) Write a prompt">
                  When the round starts, each player submits a controversial “bad take”
                </Rule>

                <Rule key="3" title="3) Random assignment">
                  After all prompts are submitted, one player is picked at random to defend a randomly selected prompt
                </Rule>

                <Rule key="4" title="4) Defend it (60 seconds)">
                  The selected player has 60 seconds to argue in favor of the prompt, even if
                  they disagree with it
                </Rule>

                <Rule key="5" title="5) Vote">
                  After the 60 seconds, all players vote on how well the player defended the prompt
                </Rule>

                <Rule key="6" title="6) No repeats in a round">
                  After a player defends once, they can't be selected again until the
                  next round (with new prompts)
                </Rule>

                <Rule key="7" title="7) Results">
                  Points are totaled and the top players are shown at the end.
                </Rule>
              </ScrollView>

              <Dialog.Close asChild>
                <Button bordered style={{ height: 48, borderRadius: 14, marginTop: 12 }}>
                  <Text style={{ color: PRIMARY, fontSize: 18, fontWeight: '800' }}>
                    Close
                  </Text>
                </Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      </View>
    </View>
  )
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: PRIMARY, fontSize: 16, fontWeight: '800' }}>
        {title}
      </Text>
      <Text style={{ color: PRIMARY, fontSize: 14, marginTop: 4, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  )
}
