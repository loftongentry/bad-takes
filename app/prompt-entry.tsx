import { View } from "tamagui"
import { Page } from "../src/ui/Page"
import { PrimaryButton } from "../src/ui/PrimaryButton"
import { useLobby } from "../src/hooks/useLobby"
import { useGameSessionStore } from "../src/state/gameSessionStore"

const PromptEntry = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const { leaveGame, loading } = useLobby(roomId || undefined)

  return (
    <Page
      title="Enter Bad Take"
      subtitle="Enter a controversial opinion below"
      onBack={leaveGame}
    >


      <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
        <PrimaryButton
          onPress={() => { }}
        >
          Submit Bad Take
        </PrimaryButton>
      </View>
    </Page >
  )
}

export default PromptEntry