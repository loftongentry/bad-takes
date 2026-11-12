import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { Crown, RefreshCw } from "@tamagui/lucide-icons";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { Board } from "../src/ui/soapbox/Board";
import { Sign } from "../src/ui/soapbox/Sign";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { Flourish, popIn, settleIn, SLAM_IMPACT_MS, thud } from "../src/ui/soapbox/motion";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import type { Player } from "../src/graphql/types";

const points = (score: number) => (score === 1 ? "1 pt" : `${score} pts`);

// Crate heights for 1st, 2nd and 3rd place
const CRATE_HEIGHT = [118, 86, 62];

// The reveal, in ms after the screen opens: crates rise from 3rd place to 1st, then the
// winner's sign slams down, then everything else
const REVEAL = {
  crate: [1200, 750, 300], // by place: 1st, 2nd, 3rd
  sign: 1900,
  rest: 2300,
  actions: 2600,
};

// A player standing on a wooden crate; the crate's height shows their place. The crate rises
// out of the ground with a springy overshoot, then the player's name drops onto it.
const Podium = ({ player, place }: { player: Player; place: number }) => {
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withDelay(
      REVEAL.crate[place],
      withSpring(CRATE_HEIGHT[place], { damping: 11, stiffness: 150 }),
    );
  }, [height, place]);
  const rise = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <View style={styles.podium}>
      <Animated.View entering={settleIn(REVEAL.crate[place] + 350)} style={styles.podiumLabel}>
        <Text style={styles.podiumName} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={styles.podiumScore}>{points(player.score)}</Text>
      </Animated.View>
      <Animated.View style={[styles.crate, rise]}>
        <View style={styles.slat} />
        <Text style={styles.crateNumber}>{place + 1}</Text>
        <View style={styles.slat} />
      </Animated.View>
    </View>
  );
};

const Results = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);

  const { room } = useRoom(roomId || undefined);
  const { leaveGame, resetGame } = useRoomActions(roomId || undefined);
  const [loading, setLoading] = useState(false);

  const isHost = room?.players.find((p) => p.id === myPlayerId)?.isHost;

  const players = room?.players || [];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  // On the podium, 1st stands in the middle with 2nd on the left and 3rd on the right
  const podium = [1, 0, 2].filter((place) => sortedPlayers[place]);
  const rest = sortedPlayers.slice(3);

  // Phones thud as the winner's sign lands
  const hasWinner = !!winner;
  useEffect(() => {
    if (!hasWinner) {
      return;
    }
    const impact = setTimeout(thud, REVEAL.sign + SLAM_IMPACT_MS);
    return () => clearTimeout(impact);
  }, [hasWinner]);

  const handlePlayAgain = async () => {
    setLoading(true);
    try {
      await resetGame();
    } catch (e) {
      console.error(e);
      alert("Failed to reset game");
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
      {winner ? (
        <Flourish kind="slam" delay={REVEAL.sign}>
          <Sign tilt={-2}>
            <Animated.View entering={popIn(REVEAL.sign + 520)}>
              <Crown size={44} color={SOAPBOX.marker} fill={SOAPBOX.caution} />
            </Animated.View>
            <Text style={styles.champion}>Grand Champion</Text>
            <Text style={styles.winnerName}>{winner.name}</Text>
            <View style={styles.winnerPoints}>
              <Text style={styles.winnerPointsText}>{points(winner.score)}</Text>
            </View>
          </Sign>
        </Flourish>
      ) : null}

      <View style={styles.stage}>
        {podium.map((place) => (
          <Podium key={sortedPlayers[place].id} player={sortedPlayers[place]} place={place} />
        ))}
      </View>
      <View style={styles.ground} />

      {rest.length > 0 ? (
        <Board delay={REVEAL.rest} style={{ marginTop: 26 }}>
          {rest.map((player, i) => (
            <View
              key={player.id}
              style={[styles.row, i === rest.length - 1 ? null : styles.rowDivider]}
            >
              <Text style={styles.rank}>#{i + 4}</Text>
              <Text style={styles.rowName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.rowScore}>{player.score}</Text>
            </View>
          ))}
        </Board>
      ) : null}

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
  champion: {
    marginTop: 8,
    fontFamily: FONTS.heading,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: SOAPBOX.markerSoft,
  },
  winnerName: {
    marginTop: 2,
    fontFamily: FONTS.heading,
    fontSize: 34,
    textAlign: "center",
    color: SOAPBOX.marker,
  },
  winnerPoints: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: SOAPBOX.marker,
    borderRadius: 3,
  },
  winnerPointsText: { fontFamily: FONTS.heading, fontSize: 18, color: SOAPBOX.paper },
  stage: {
    // Tall enough for the highest crate plus a name, so nothing below moves as crates rise
    height: CRATE_HEIGHT[0] + 58,
    marginTop: 34,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
  },
  podium: { flex: 1, maxWidth: 104, alignItems: "center" },
  podiumName: { fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker },
  podiumScore: {
    marginBottom: 6,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: SOAPBOX.markerSoft,
  },
  podiumLabel: { alignItems: "center" },
  crate: {
    width: "100%",
    overflow: "hidden",
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: SOAPBOX.wood,
    borderWidth: 2.5,
    borderColor: SOAPBOX.woodDark,
    borderRadius: 2,
    boxShadow: `3px 4px 0px ${SOAPBOX.woodDark}`,
  },
  slat: { alignSelf: "stretch", height: 2.5, backgroundColor: SOAPBOX.woodDark, opacity: 0.6 },
  crateNumber: { fontFamily: FONTS.heading, fontSize: 30, color: SOAPBOX.paper },
  ground: { height: 3, marginTop: -1, backgroundColor: SOAPBOX.woodDark, borderRadius: 2 },
  row: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12 },
  rowDivider: { borderBottomWidth: 1.5, borderBottomColor: "rgba(31, 26, 23, 0.16)" },
  rank: { width: 32, fontFamily: FONTS.heading, fontSize: 15, color: SOAPBOX.markerSoft },
  rowName: { flex: 1, fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker },
  rowScore: { fontFamily: FONTS.heading, fontSize: 16, color: SOAPBOX.marker },
  note: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});

export default Results;
