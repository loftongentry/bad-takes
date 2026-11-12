import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import { Crown } from "@tamagui/lucide-icons";
import type { Player } from "../../graphql/types";
import { Board } from "./Board";
import { Sign } from "./Sign";
import { play } from "../../audio/sfx";
import { Flourish, popIn, settleIn } from "./motion";
import { FONTS, SOAPBOX } from "./tokens";

const points = (score: number) => (score === 1 ? "1 pt" : `${score} pts`);

// Crate heights for 1st, 2nd and 3rd place
const CRATE_HEIGHT = [118, 86, 62];

// The reveal, in ms after the screen opens: crates rise from 3rd place to 1st, then the
// winner's sign slams down, then everything else
export const REVEAL = {
  crate: [1200, 750, 300], // by place: 1st, 2nd, 3rd
  sign: 1900,
  crown: 2420,
  rest: 2300,
  actions: 2600,
};

// "Hannah", "Hannah & Gus", "Hannah, Gus & Ivy", or "4 players" for a bigger tie
const joinNames = (names: string[]) =>
  names.length > 3
    ? `${names.length} players`
    : names.length > 1
      ? `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`
      : (names[0] ?? "");

// A player standing on a wooden crate. `place` (0 = middle, 1 = left, 2 = right) sets where they
// stand and when their crate rises; `rank` (1st, 2nd...; tied players share one) sets its height
// and number. The crate rises out of the ground with a springy overshoot, then the name drops on.
const Podium = ({
  player,
  place,
  rank,
  silent,
}: {
  player: Player;
  place: number;
  rank: number;
  silent: boolean;
}) => {
  const height = useSharedValue(0);
  useEffect(() => {
    height.value = withDelay(
      REVEAL.crate[place],
      withSpring(CRATE_HEIGHT[rank - 1], { damping: 11, stiffness: 150 }),
    );
    if (silent) {
      return;
    }
    // A wooden knock as the crate shoots up
    const knock = setTimeout(() => play("crate"), REVEAL.crate[place] + 120);
    return () => clearTimeout(knock);
  }, [height, place, rank, silent]);
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
        <Text style={styles.crateNumber}>{rank}</Text>
        <View style={styles.slat} />
      </Animated.View>
    </View>
  );
};

// The end-of-game reveal: crates rise from 3rd place to 1st, the winner's sign slams down with
// a crown, then anyone below 3rd is listed. Used by the Results screen (and the Motion lab).
// `silent` skips the sounds (the Motion lab's first, automatic play).
export const ResultsReveal = ({
  players,
  silent = false,
}: {
  players: Player[];
  silent?: boolean;
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  // Standard competition ranking: tied players share a place (1, 1, 3...)
  const rankOf = (score: number) => 1 + sortedPlayers.filter((p) => p.score > score).length;
  const winner = sortedPlayers[0];
  // Everyone tied for first (usually just the winner)
  const champions = winner ? sortedPlayers.filter((p) => p.score === winner.score) : [];
  const tie = champions.length > 1;
  // On the podium, 1st stands in the middle with 2nd on the left and 3rd on the right
  const podium = [1, 0, 2].filter((place) => sortedPlayers[place]);
  const rest = sortedPlayers.slice(3);

  // A fanfare as the crown lands on the winner's sign (the sign's slam makes its own sound)
  const hasWinner = !!winner;
  useEffect(() => {
    if (!hasWinner || silent) {
      return;
    }
    const crowned = setTimeout(() => play("fanfare"), REVEAL.crown);
    return () => clearTimeout(crowned);
  }, [hasWinner, silent]);

  return (
    <>
      {winner ? (
        <Flourish kind="slam" delay={REVEAL.sign} silent={silent}>
          <Sign tilt={-2}>
            <Animated.View entering={popIn(REVEAL.crown)}>
              <Crown size={44} color={SOAPBOX.marker} fill={SOAPBOX.caution} />
            </Animated.View>
            <Text style={styles.champion}>{tie ? "It's a tie!" : "Grand Champion"}</Text>
            <Text style={[styles.winnerName, tie ? styles.winnerNameTie : null]}>
              {joinNames(champions.map((p) => p.name))}
            </Text>
            <View style={styles.winnerPoints}>
              <Text style={styles.winnerPointsText}>
                {points(winner.score)}
                {tie ? " each" : ""}
              </Text>
            </View>
          </Sign>
        </Flourish>
      ) : null}

      <View style={styles.stage}>
        {podium.map((place) => (
          <Podium
            key={sortedPlayers[place].id}
            player={sortedPlayers[place]}
            place={place}
            rank={rankOf(sortedPlayers[place].score)}
            silent={silent}
          />
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
              <Text style={styles.rank}>#{rankOf(player.score)}</Text>
              <Text style={styles.rowName} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={styles.rowScore}>{player.score}</Text>
            </View>
          ))}
        </Board>
      ) : null}
    </>
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
  winnerNameTie: { fontSize: 28 },
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
});
