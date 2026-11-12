import { useEffect, useId } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { FONTS, SOAPBOX } from "./tokens";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// A strip of caution tape that shrinks as time runs out, with the time left on a paper tag.
// The tape slides down smoothly between seconds. `urgent` turns the stripes red for the last
// few seconds, and the whole strip jolts on every tick.
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
  const stripe = urgent ? SOAPBOX.boo : SOAPBOX.caution;
  const reduceMotion = useReducedMotion();

  // The countdown ticks once a second; glide the tape through each second instead of jumping
  const progress = useSharedValue(clamp01(fraction));
  useEffect(() => {
    progress.value = withTiming(clamp01(fraction), { duration: 950, easing: Easing.linear });
  }, [fraction, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  // In the last seconds, a short jolt each time the label changes
  const jolt = useSharedValue(0);
  useEffect(() => {
    if (!urgent || reduceMotion) {
      return;
    }
    jolt.value = withSequence(
      withTiming(1, { duration: 50 }),
      withTiming(-1, { duration: 70 }),
      withTiming(0.6, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }, [label, urgent, reduceMotion, jolt]);
  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: jolt.value * 3 }, { rotate: `${jolt.value * 0.8}deg` }],
  }));

  return (
    <Animated.View
      style={[styles.track, shake]}
      accessibilityRole="timer"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.fill, fill]}>
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
      </Animated.View>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{label}</Text>
      </View>
    </Animated.View>
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
