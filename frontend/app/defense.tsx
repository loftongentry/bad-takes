import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { TakeSign } from "../src/ui/soapbox/TakeSign";
import { TapeTimer } from "../src/ui/soapbox/TapeTimer";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { Flourish, settleIn } from "../src/ui/soapbox/motion";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import { useDefenseTimer } from "../src/hooks/useDefenseTimer";
import { reportActionError } from "../src/ui/reportError";

// The take sign slams down shortly after a turn starts
const SLAM_DELAY_MS = 150;

// "0:37"
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const Defense = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);
  const { room } = useRoom(roomId || undefined);
  const { endTurn } = useRoomActions(roomId || undefined);
  const rules = useRules();
  const [ending, setEnding] = useState(false);

  const handleEndDefense = async () => {
    setEnding(true);
    try {
      await endTurn();
    } catch (error) {
      reportActionError(
        "Couldn't end your defense",
        error,
        "If it keeps failing, your defense ends on its own when time runs out.",
      );
    } finally {
      setEnding(false);
    }
  };

  const currentTurn = room?.gameState?.currentTurn;
  const isMe = currentTurn?.defenderId === myPlayerId;
  const defenderName =
    room?.players.find((p) => p.id === currentTurn?.defenderId)?.name || "Unknown";

  // Counts down to the server's deadline (prep countdown + defense time); the server moves
  // everyone to voting when it passes
  const { phase, timeLeft, maxTime } = useDefenseTimer(
    room?.gameState?.deadline,
    rules?.prepSeconds ?? 0,
    room?.settings.timeLimit ?? 0,
  );

  // A new turn replays the slam (and its thud)
  const turnKey = currentTurn ? `${currentTurn.defenderId}:${currentTurn.promptText}` : null;

  if (!currentTurn || !rules) {
    return (
      <SoapboxPage
        headerRight={<HostPlayersMenu room={room} />}
        title="Loading..."
        showBack={false}
      >
        <WaitingNote>Preparing the next turn...</WaitingNote>
      </SoapboxPage>
    );
  }

  const headerText = phase === "PREP" ? "Get Ready!" : isMe ? "DEFEND THIS!" : "Listen Up!";

  return (
    <SoapboxPage
      headerRight={<HostPlayersMenu room={room} />}
      title={headerText}
      titleEntrance="punch"
      showBack={false}
    >
      {/* During the prep countdown the tape is full and shows when the defense starts */}
      <TapeTimer
        fraction={phase === "PREP" ? 1 : timeLeft / maxTime}
        label={phase === "PREP" ? `Starts in ${timeLeft}` : clock(timeLeft)}
        urgent={phase === "DEFEND" && timeLeft < 10}
      />

      <Animated.Text entering={settleIn(80)} style={styles.who}>
        {isMe ? (
          "You are defending:"
        ) : (
          <>
            <Text style={styles.whoName}>{defenderName}</Text> is defending:
          </>
        )}
      </Animated.Text>

      <Flourish key={turnKey} kind="slam" delay={SLAM_DELAY_MS}>
        <TakeSign text={currentTurn.promptText} />
      </Flourish>

      {isMe && phase === "DEFEND" ? (
        <Animated.View entering={settleIn()} style={{ marginTop: 32 }}>
          <SoapboxButton disabled={ending} onPress={handleEndDefense}>
            {ending ? <ActivityIndicator color={SOAPBOX.paper} /> : "End Defense"}
          </SoapboxButton>
        </Animated.View>
      ) : null}
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  who: {
    marginTop: 22,
    marginBottom: 26,
    fontFamily: FONTS.body,
    fontSize: 17,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
  whoName: { fontFamily: FONTS.heading, color: SOAPBOX.marker },
});

export default Defense;
