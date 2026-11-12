import { useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { FONTS, SOAPBOX } from "./tokens";

// A strip of caution tape that shrinks as time runs out, with the time left on a paper tag.
// `urgent` turns the stripes red for the last few seconds.
export const TapeTimer = ({
  fraction,
  label,
  urgent = false,
}: {
  fraction: number; // 1 = full time left, 0 = time's up
  label: string;
  urgent?: boolean;
}) => {
  const id = `tape-stripes-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%` as const;
  const stripe = urgent ? SOAPBOX.boo : SOAPBOX.caution;

  return (
    <View style={styles.track} accessibilityRole="timer" accessibilityLabel={label}>
      <View style={[styles.fill, { width }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id={id}
              width={18}
              height={18}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-45)"
            >
              <Rect width={9} height={18} fill={stripe} />
              <Rect x={9} width={9} height={18} fill={SOAPBOX.marker} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: "100%",
    height: 32,
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    borderRadius: 3,
    backgroundColor: "#E9D7BF",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  tag: {
    position: "absolute",
    right: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
    backgroundColor: SOAPBOX.paper,
    borderWidth: 2,
    borderColor: SOAPBOX.marker,
    borderRadius: 3,
  },
  tagText: { fontFamily: FONTS.heading, fontSize: 13, color: SOAPBOX.marker },
});
