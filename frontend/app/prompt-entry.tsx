// TODO: Add a 'Game starting!' screen after all player have submitted their bad takes before shifting to defense screen
import { useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { Sign } from "../src/ui/soapbox/Sign";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { TapeTimer } from "../src/ui/soapbox/TapeTimer";
import { takeFontSize, takeTextStyle } from "../src/ui/soapbox/TakeSign";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { FONTS, NO_WEB_OUTLINE, SOAPBOX } from "../src/ui/soapbox/tokens";
import { throwOut } from "../src/ui/soapbox/motion";
import { play } from "../src/audio/sfx";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import { useSecondsLeft } from "../src/hooks/useSecondsLeft";
import { reportActionError } from "../src/ui/reportError";

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
  const timer =
    secondsLeft !== null && room ? (
      <View style={styles.timer}>
        <TapeTimer
          fraction={secondsLeft / room.settings.promptTimeLimit}
          label={`${secondsLeft}s`}
          urgent={secondsLeft <= 10}
        />
      </View>
    ) : null;

  const handleSubmitPrompt = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      const success = await submitPrompt(badTake);
      if (success) {
        play("whoosh"); // the sign gets tossed
        setJustSubmitted(true);
      }
    } catch (error) {
      reportActionError("Couldn't send your take", error);
    } finally {
      setLoading(false);
    }
  };

  // "Round 2 of 3", when there's more than one
  const rounds = room?.settings.rounds ?? 1;
  const roundLabel =
    rounds > 1 && room?.gameState ? `Round ${room.gameState.round} of ${rounds}` : null;

  if (isSubmitted) {
    const count = room?.gameState?.submittedPromptsCount || 0;
    const total = room?.players.length || 0;

    return (
      <SoapboxPage
        headerRight={<HostPlayersMenu room={room} />}
        title="Bad Take Submitted!"
        subtitle={roundLabel ?? undefined}
        onBack={leaveGame}
      >
        {timer}
        <WaitingNote
          detail={secondsLeft !== null ? `Starting in ${secondsLeft}s at the latest.` : undefined}
        >
          Waiting on {total - count} {total - count > 1 ? "players" : "player"} to finish their
          terrible opinions...
        </WaitingNote>
      </SoapboxPage>
    );
  }

  const nearLimit = charLimit !== undefined && badTake.length > charLimit - 10;
  const size = takeFontSize(badTake);

  return (
    <SoapboxPage
      headerRight={<HostPlayersMenu room={room} />}
      title="Enter Bad Take"
      subtitle={
        roundLabel
          ? `${roundLabel}${secondsLeft !== null ? ` · ${secondsLeft}s left` : ""}`
          : secondsLeft !== null
            ? `Enter a controversial opinion · ${secondsLeft}s left`
            : "Enter a controversial opinion below"
      }
      onBack={leaveGame}
    >
      {timer}

      {/* No entrance (the field focuses itself as the screen opens, which an entrance would
          block on the web); once submitted, the sign gets tossed off the top of the screen.
          It ignores touches while sending, so the copy that flies away (made from it as it is
          then) can't catch a tap meant for the buttons it passes over. */}
      <Animated.View exiting={throwOut} style={{ pointerEvents: loading ? "none" : "auto" }}>
        <Sign tilt={-1}>
          <TextInput
            value={badTake}
            onChangeText={setBadTake}
            placeholder="Pineapple belongs on pizza..."
            placeholderTextColor="rgba(31, 26, 23, 0.35)"
            accessibilityLabel="Your bad take"
            multiline
            autoFocus
            maxLength={charLimit}
            editable={!loading}
            submitBehavior="blurAndSubmit"
            style={[
              takeTextStyle,
              styles.input,
              NO_WEB_OUTLINE,
              { fontSize: size, lineHeight: Math.round(size * 1.25) },
            ]}
          />
          {charLimit !== undefined ? (
            <Text style={[styles.counter, nearLimit ? styles.counterNear : null]}>
              {badTake.length}/{charLimit}
            </Text>
          ) : null}
        </Sign>
      </Animated.View>

      <View style={{ marginTop: 28 }}>
        <SoapboxButton
          onPress={handleSubmitPrompt}
          disabled={
            loading ||
            charLimit === undefined ||
            badTake.trim().length === 0 ||
            badTake.length > charLimit
          }
        >
          {loading ? <ActivityIndicator color={SOAPBOX.paper} /> : "Submit Bad Take"}
        </SoapboxButton>
      </View>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  timer: { marginBottom: 30 },
  input: {
    width: "100%",
    minHeight: 150,
    textAlignVertical: "center",
  },
  counter: {
    alignSelf: "flex-end",
    marginTop: 8,
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    color: SOAPBOX.markerSoft,
  },
  counterNear: { color: SOAPBOX.boo },
});

export default PromptEntry;
