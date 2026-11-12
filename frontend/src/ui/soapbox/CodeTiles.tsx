import { StyleSheet, Text, View } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

// Each letter sits a bit crooked, like a ransom note
const TILE_TILT = [-4, 3, -2, 4, -3];

// A room code on paper tiles. Empty slots are dashed outlines; `activeIndex` marks the next
// one to fill (Join), and `large` is for showing a code off (Lobby).
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
        <View
          key={i}
          style={[
            styles.tile,
            large ? styles.tileLarge : null,
            ch ? [styles.filled, { transform: [{ rotate: `${TILE_TILT[i % 5]}deg` }] }] : null,
            i === activeIndex ? styles.active : null,
          ]}
        >
          <Text style={[styles.letter, large ? styles.letterLarge : null]}>{ch}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", justifyContent: "center", gap: 8 },
  tile: {
    flex: 1,
    maxWidth: 56,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(31, 26, 23, 0.35)",
    borderRadius: 4,
    backgroundColor: "rgba(31, 26, 23, 0.05)",
  },
  tileLarge: { maxWidth: 60, height: 70 },
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
