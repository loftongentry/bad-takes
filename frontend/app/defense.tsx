import { StyleSheet, Text, View } from "react-native";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { TakeSign } from "../src/ui/soapbox/TakeSign";
import { TapeTimer } from "../src/ui/soapbox/TapeTimer";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import { useDefenseTimer } from "../src/hooks/useDefenseTimer";

// "0:37"
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const Defense = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);
  const { room } = useRoom(roomId || undefined);
  const { endTurn } = useRoomActions(roomId || undefined);
  const rules = useRules();

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
    <SoapboxPage headerRight={<HostPlayersMenu room={room} />} title={headerText} showBack={false}>
      {/* During the prep countdown the tape is full and shows when the defense starts */}
      <TapeTimer
        fraction={phase === "PREP" ? 1 : timeLeft / maxTime}
        label={phase === "PREP" ? `Starts in ${timeLeft}` : clock(timeLeft)}
        urgent={phase === "DEFEND" && timeLeft < 10}
      />

      <Text style={styles.who}>
        {isMe ? (
          "You are defending:"
        ) : (
          <>
            <Text style={styles.whoName}>{defenderName}</Text> is defending:
          </>
        )}
      </Text>

      <TakeSign text={currentTurn.promptText} />

      {isMe && phase === "DEFEND" ? (
        <View style={{ marginTop: 32 }}>
          <SoapboxButton onPress={() => endTurn()}>End Defense</SoapboxButton>
        </View>
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
