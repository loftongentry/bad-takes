import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated from "react-native-reanimated";
import { RefreshCw } from "@tamagui/lucide-icons";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { ResultsReveal, REVEAL } from "../src/ui/soapbox/ResultsReveal";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { settleIn } from "../src/ui/soapbox/motion";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { reportActionError } from "../src/ui/reportError";

const Results = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);

  const { room } = useRoom(roomId || undefined);
  const { leaveGame, resetGame } = useRoomActions(roomId || undefined);
  const [loading, setLoading] = useState(false);

  const isHost = room?.players.find((p) => p.id === myPlayerId)?.isHost;

  const handlePlayAgain = async () => {
    setLoading(true);
    try {
      await resetGame();
    } catch (error) {
      reportActionError("Couldn't start a new game", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SoapboxPage
      headerRight={<HostPlayersMenu room={room} />}
      title="Game Results"
      onBack={leaveGame}
    >
      <ResultsReveal players={room?.players || []} />

      <Animated.View entering={settleIn(REVEAL.actions)} style={{ marginTop: 28 }}>
        {isHost ? (
          <SoapboxButton
            onPress={handlePlayAgain}
            disabled={loading}
            icon={<RefreshCw size={20} color={SOAPBOX.paper} />}
          >
            {loading ? "Resetting..." : "Play Again"}
          </SoapboxButton>
        ) : (
          <Text style={styles.note}>Waiting for host to restart...</Text>
        )}
      </Animated.View>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  note: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});

export default Results;
