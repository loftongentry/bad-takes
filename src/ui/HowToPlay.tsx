import { Button, Dialog, ScrollView, Text, View } from "tamagui";
import { Info } from '@tamagui/lucide-icons'
import { PrimaryButton } from "./PrimaryButton";
import { COLORS } from "./theme";

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: COLORS.light, fontSize: 16, fontWeight: '800' }}>
        {title}
      </Text>
      <Text style={{ color: COLORS.light, fontSize: 14, marginTop: 4, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  )
}

export function HowToPlay() {
  return (
    <Dialog modal>
      <Dialog.Trigger asChild>
        <PrimaryButton
          onPress={() => { }}
          invert
          icon={<Info color={'#1B1D1B'} size={24} />}
        >
          How to Play
        </PrimaryButton>
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
            style={{ color: COLORS.light, fontSize: 22, fontWeight: '900' }}
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
              <Text style={{ color: COLORS.light, fontSize: 18, fontWeight: '800' }}>
                Close
              </Text>
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}