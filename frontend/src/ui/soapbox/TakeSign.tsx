import { StyleSheet, Text, View } from "react-native";
import { Flourish } from "./motion";
import { Sign } from "./Sign";
import { FONTS, SOAPBOX } from "./tokens";

// Marker lettering shrinks a little as a take gets longer (takes are at most 140 characters)
export const takeFontSize = (text: string) => (text.length > 100 ? 21 : text.length > 50 ? 25 : 30);

export const takeTextStyle = {
  fontFamily: FONTS.marker,
  color: SOAPBOX.marker,
  textAlign: "center",
} as const;

const STAMPS = {
  down: { word: "BOO", color: SOAPBOX.boo },
  up: { word: "CHEER", color: SOAPBOX.cheer },
} as const;
export type StampKind = keyof typeof STAMPS;

// The inked mark a vote stamp leaves on a sign. It slams down when it first appears.
const StampMark = ({ kind }: { kind: StampKind }) => (
  <View style={styles.markLayer} pointerEvents="none">
    <Flourish kind="stamp" style={[styles.mark, { borderColor: STAMPS[kind].color }]}>
      <View style={[styles.markInner, { borderColor: STAMPS[kind].color }]}>
        <Text
          style={[styles.markWord, { color: STAMPS[kind].color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {STAMPS[kind].word}
        </Text>
      </View>
    </Flourish>
  </View>
);

// A bad take, hand-lettered on a cardboard sign, optionally with a vote stamped across it.
// The stamp is drawn inside the sign's cardboard, after the lettering, so it's always on top
// (as a separate layer next to the sign, iOS drew it behind the cardboard).
export const TakeSign = ({
  text,
  tilt = -2,
  stamp,
}: {
  text: string;
  tilt?: number;
  stamp?: StampKind | null;
}) => {
  const size = takeFontSize(text);
  return (
    <Sign tilt={tilt}>
      <Text style={[takeTextStyle, styles.text, { fontSize: size, lineHeight: size * 1.25 }]}>
        {text}
      </Text>
      {stamp ? <StampMark kind={stamp} /> : null}
    </Sign>
  );
};

const styles = StyleSheet.create({
  text: { width: "100%", paddingVertical: 6 },
  markLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    padding: 4,
    borderWidth: 5,
    borderRadius: 6,
    backgroundColor: "rgba(243, 231, 214, 0.35)",
  },
  markInner: { paddingHorizontal: 14, paddingVertical: 4, borderWidth: 2, borderRadius: 3 },
  // paddingLeft matches letterSpacing: iOS adds spacing after the last letter too
  markWord: {
    textAlign: "center",
    fontFamily: FONTS.heading,
    fontSize: 36,
    letterSpacing: 2,
    paddingLeft: 2,
  },
});
