import { useEffect, useState } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { FONTS, SOAPBOX } from "./tokens";

// Enough copies of the text to cover the widest screen plus one extra copy to scroll into
const COPIES = 10;

// A strip of caution tape stretched across the screen. Decoration only: position it with
// `style` (top/bottom and a rotate transform) and it runs past both edges of the screen.
// With `direction`, the printing scrolls slowly along the tape (unless the phone is set to
// reduce motion).
export const CautionTape = ({
  text = "CAUTION",
  direction,
  speed = 24,
  style,
}: {
  text?: string;
  direction?: "left" | "right";
  speed?: number; // points per second
  style?: StyleProp<ViewStyle>;
}) => {
  const reduceMotion = useReducedMotion();
  // Width of one "TEXT ●" unit; scrolling by exactly one unit and repeating loops seamlessly
  const [unitWidth, setUnitWidth] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (!direction || !unitWidth || reduceMotion) {
      cancelAnimation(offset);
      offset.value = 0;
      return;
    }
    const from = direction === "right" ? -unitWidth : 0;
    const to = direction === "right" ? 0 : -unitWidth;
    offset.value = from;
    offset.value = withRepeat(
      withTiming(to, { duration: (unitWidth / speed) * 1000, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(offset);
  }, [direction, unitWidth, reduceMotion, speed, offset]);

  const scroll = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View style={[styles.tape, style]} pointerEvents="none" aria-hidden>
      <Animated.View style={[styles.row, scroll]}>
        {Array.from({ length: COPIES }, (_, i) => (
          <View
            key={i}
            style={styles.unit}
            onLayout={i === 0 ? (e) => setUnitWidth(e.nativeEvent.layout.width) : undefined}
          >
            <Text style={styles.text}>{text}</Text>
            <Text style={styles.dot}>●</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  tape: {
    position: "absolute",
    left: -60,
    right: -60,
    height: 34,
    overflow: "hidden",
    backgroundColor: SOAPBOX.caution,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(31, 26, 23, 0.25)",
    boxShadow: "0px 3px 0px rgba(31, 26, 23, 0.18)",
  },
  row: { position: "absolute", top: 0, bottom: 0, left: 0, flexDirection: "row" },
  unit: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  text: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 2,
    color: SOAPBOX.marker,
  },
  dot: { marginHorizontal: 16, fontSize: 9, color: SOAPBOX.marker },
});
