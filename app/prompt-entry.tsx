import { useState } from "react"
import { Card, TextArea, View, Text, XStack, Spinner } from "tamagui"
import { Page } from "../src/ui/Page"
import { PrimaryButton } from "../src/ui/PrimaryButton"
import { useLobby } from "../src/hooks/useLobby"
import { useGameSessionStore } from "../src/state/gameSessionStore"
import { COLORS } from "../src/ui/theme"
import { Keyboard, TouchableWithoutFeedback } from "react-native"

const PromptEntry = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null)
  const { leaveGame, submitPrompt } = useLobby(roomId || undefined)
  const [badTake, setBadTake] = useState<string>('')
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  const CHAR_LIMIT = 140

  const handleSubmitPrompt = async () => {
    setLoading(true)

    try {
      await submitPrompt(badTake);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit bad take:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Page
        title="Bad Take Submitted!"
        onBack={leaveGame}
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
            Waiting for other players to finish their terrible opinions...
          </Text>
        </View>
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
          <TextArea
            value={badTake}
            onChangeText={setBadTake}
            placeholder="Enter your bad take..."
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
        </Card>

        <View style={{ width: '100%', maxWidth: 340, marginTop: 22 }}>
          <PrimaryButton
            onPress={handleSubmitPrompt}
            disabled={loading || badTake.length === 0 || badTake.length > CHAR_LIMIT}
          >
            {loading ? <Spinner /> : "Submit Bad Take"}
          </PrimaryButton>
        </View>
      </Page >
    </TouchableWithoutFeedback>
  )
}

export default PromptEntry