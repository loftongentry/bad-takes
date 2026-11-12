// TODO: Add a 'Game starting!' screen after all player have submitted their bad takes before shifting to defense screen
import { useState } from "react";
import { TextArea, Text, XStack, Spinner } from "tamagui";
import { Keyboard, TouchableWithoutFeedback } from "react-native";
import { Page } from "../src/ui/Page";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { PrimaryButton } from "../src/ui/PrimaryButton";
import { PromptCard, promptTextStyle } from "../src/ui/PromptCard";
import { SpinnerMessage } from "../src/ui/SpinnerMessage";
import { ActionRow } from "../src/ui/ActionRow";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import { useSecondsLeft } from "../src/hooks/useSecondsLeft";

const PromptEntry = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);
  const { room } = useRoom(roomId || undefined);
  const { leaveGame, submitPrompt } = useRoomActions(roomId || undefined);
  // The server's limit on a take's length (undefined only until the rules load)
  const charLimit = useRules()?.promptMaxLength;
  const [badTake, setBadTake] = useState<string>("");
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // The server knows who has written a take. The local flag only covers the moment between
  // the submit succeeding and the room update arriving.
  const isSubmitted =
    justSubmitted || (!!myPlayerId && !!room?.gameState?.submittedPlayerIds.includes(myPlayerId));

  // Writing time set by the host; when it runs out the game starts with the takes that are in
  const secondsLeft = useSecondsLeft(
    room?.status === "PROMPT_ENTRY" ? room.gameState?.deadline : null,
  );

  const handleSubmitPrompt = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const success = await submitPrompt(badTake);
      if (success) {
        setJustSubmitted(true);
      }
    } catch (error) {
      console.error("Failed to submit bad take:", error);
      alert("Failed to submit bad take. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    const count = room?.gameState?.submittedPromptsCount || 0;
    const total = room?.players.length || 0;

    return (
      <Page
        headerRight={<HostPlayersMenu room={room} />}
        title="Bad Take Submitted!"
        onBack={leaveGame}
      >
        <SpinnerMessage>
          Waiting on {total - count} {total - count > 1 ? "players" : "player"} to finish their
          terrible opinions...
          {secondsLeft !== null ? `\nStarting in ${secondsLeft}s at the latest.` : ""}
        </SpinnerMessage>
      </Page>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <Page
        headerRight={<HostPlayersMenu room={room} />}
        title="Enter Bad Take"
        subtitle={
          secondsLeft !== null
            ? `Enter a controversial opinion · ${secondsLeft}s left`
            : "Enter a controversial opinion below"
        }
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
            maxLength={charLimit}
            editable={!loading}
            submitBehavior="blurAndSubmit"
          />
          <XStack
            style={{
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            {charLimit !== undefined ? (
              <Text
                fontSize={14}
                color={badTake.length > charLimit - 10 ? "red" : "rgba(0,0,0,0.4)"}
                fontWeight="700"
              >
                {badTake.length}/{charLimit}
              </Text>
            ) : null}
          </XStack>
        </PromptCard>

        <ActionRow>
          <PrimaryButton
            onPress={handleSubmitPrompt}
            disabled={
              loading ||
              charLimit === undefined ||
              badTake.trim().length === 0 ||
              badTake.length > charLimit
            }
          >
            {loading ? <Spinner /> : "Submit Bad Take"}
          </PrimaryButton>
        </ActionRow>
      </Page>
    </TouchableWithoutFeedback>
  );
};

export default PromptEntry;
