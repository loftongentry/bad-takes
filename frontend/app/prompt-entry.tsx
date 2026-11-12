// TODO: Derive state from server data instead of local state
// TODO: Add a 'Game starting!' screen after all player have submitted their bad takes before shifting to defense screen
import { useState } from "react"
import { TextArea, Text, XStack, Spinner } from "tamagui"
import { Keyboard, TouchableWithoutFeedback } from "react-native"
import { Page } from "../src/ui/Page"
import { PrimaryButton } from "../src/ui/PrimaryButton"
import { PromptCard, promptTextStyle } from "../src/ui/PromptCard"
import { SpinnerMessage } from "../src/ui/SpinnerMessage"
import { ActionRow } from "../src/ui/ActionRow"
import { useGameSessionStore } from "../src/state/gameSessionStore"
import { useRoom } from "../src/hooks/useRoom"
import { useRoomActions } from "../src/hooks/useRoomActions"
import { useStatusRedirect } from "../src/hooks/useStatusRedirect"

const CHAR_LIMIT = 140

const PromptEntry = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const { room } = useRoom(roomId || undefined)
  const { leaveGame, submitPrompt } = useRoomActions(roomId || undefined)
  const [badTake, setBadTake] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  useStatusRedirect(room?.status, { DEFENSE: '/defense' })

  const handleSubmitPrompt = async () => {
    Keyboard.dismiss();
    setLoading(true)

    try {
      const success = await submitPrompt(badTake);
      if (success) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error("Failed to submit bad take:", error);
      alert("Failed to submit bad take. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    // TODO: This isn't retrieving the submittedPromptsCount correctly after submission
    const count = room?.gameState?.submittedPromptsCount || 0;
    const total = room?.players.length || 0;

    return (
      <Page
        title="Bad Take Submitted!"
        onBack={leaveGame}
      >
        <SpinnerMessage>
          Waiting on {total - count} {total - count > 1 ? 'players' : 'player'} to finish their terrible opinions...
        </SpinnerMessage>
      </Page>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Page
        title="Enter Bad Take"
        subtitle="Enter a controversial opinion below"
        onBack={leaveGame}
      >
        <PromptCard>
          <TextArea
            value={badTake}
            onChangeText={setBadTake}
            placeholder="Enter your bad take..."
            unstyled
            style={promptTextStyle}
            multiline
            autoFocus
            maxLength={CHAR_LIMIT}
            editable={!loading}
            submitBehavior="blurAndSubmit"
          />
          <XStack
            style={{
              justifyContent: 'flex-end',
              marginTop: 10
            }}>
            <Text
              fontSize={14}
              color={badTake.length > CHAR_LIMIT - 10 ? 'red' : 'rgba(0,0,0,0.4)'}
              fontWeight="700"
            >
              {badTake.length}/{CHAR_LIMIT}
            </Text>
          </XStack>
        </PromptCard>

        <ActionRow>
          <PrimaryButton
            onPress={handleSubmitPrompt}
            disabled={loading || badTake.length === 0 || badTake.length > CHAR_LIMIT}
          >
            {loading ? <Spinner /> : "Submit Bad Take"}
          </PrimaryButton>
        </ActionRow>
      </Page>
    </TouchableWithoutFeedback>
  )
}

export default PromptEntry
