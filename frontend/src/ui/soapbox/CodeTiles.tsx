import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { popIn, settleIn } from "./motion";
import { FONTS, SOAPBOX } from "./tokens";

// Each letter sits a bit crooked, like a ransom note
const TILE_TILT = [-4, 3, -2, 4, -3];

// A room code on paper tiles. Empty slots are dashed outlines; `activeIndex` marks the next
// one to fill (Join), and `large` is for showing a code off (Lobby). Letters pop onto their tiles
// as they're typed; large tiles are dealt onto the board one by one.
export const CodeTiles = ({
  code,
  length = 5,
  activeIndex = -1,
  large = false,
}: {
  code: string;
  length?: number;
  activeIndex?: number;
  large?: boolean;
}) => (
  <View style={styles.tiles} accessibilityLabel={code ? `Room code ${code}` : undefined}>
    {Array.from({ length }).map((_, i) => {
      const ch = code[i] ?? "";
      return (
        // The outer view handles arriving; the inner tile keeps its crooked tilt
        <Animated.View
          key={i}
          entering={large ? settleIn(150 + i * 70) : undefined}
          style={[styles.slot, large ? styles.slotLarge : null]}
        >
          <View
            style={[
              styles.tile,
              large ? styles.tileLarge : null,
              ch ? [styles.filled, { transform: [{ rotate: `${TILE_TILT[i % 5]}deg` }] }] : null,
              i === activeIndex ? styles.active : null,
            ]}
          >
            <Animated.Text
              key={ch || "empty"}
              entering={ch !== "" && !large ? popIn() : undefined}
              style={[styles.letter, large ? styles.letterLarge : null]}
            >
              {ch}
            </Animated.Text>
          </View>
        </Animated.View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", justifyContent: "center", gap: 8 },
  slot: { flex: 1, maxWidth: 56 },
  slotLarge: { maxWidth: 60 },
  tile: {
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(31, 26, 23, 0.35)",
    borderRadius: 4,
    backgroundColor: "rgba(31, 26, 23, 0.05)",
  },
  tileLarge: { height: 70 },
  filled: {
    borderStyle: "solid",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    backgroundColor: SOAPBOX.paper,
    boxShadow: `2px 3px 0px ${SOAPBOX.marker}`,
  },
  active: {
    borderStyle: "solid",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    backgroundColor: SOAPBOX.caution,
  },
  letter: { fontFamily: FONTS.heading, fontSize: 26, color: SOAPBOX.marker },
  letterLarge: { fontSize: 32 },
});
