import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { settleIn } from "./motion";
import { FONTS, SOAPBOX } from "./tokens";

// A paper note with a spinner, for "waiting on other players" moments. It settles in, then
// sways gently on its tape while everyone waits.
export const WaitingNote = ({ children, detail }: { children: ReactNode; detail?: ReactNode }) => {
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }
    sway.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(sway);
  }, [reduceMotion, sway]);

  // Between 0.2° and 1.8°, around the note's resting tilt of 1°
  const swing = useAnimatedStyle(() => ({
    transform: [{ rotate: `${0.2 + sway.value * 1.6}deg` }],
  }));

  return (
    // Arrival and sway are on separate views so one transform doesn't override the other
    <Animated.View entering={settleIn()}>
      <Animated.View style={[styles.note, swing]}>
        <View style={styles.tape} />
        <ActivityIndicator size="large" color={SOAPBOX.marker} />
        <Text style={styles.message}>{children}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  note: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingVertical: 26,
    paddingHorizontal: 22,
    backgroundColor: SOAPBOX.paper,
    borderWidth: 2,
    borderColor: SOAPBOX.marker,
    borderRadius: 3,
    boxShadow: "5px 6px 0px rgba(31, 26, 23, 0.35)",
  },
  tape: {
    position: "absolute",
    top: -12,
    width: 96,
    height: 24,
    backgroundColor: SOAPBOX.caution,
    opacity: 0.9,
    transform: [{ rotate: "-3deg" }],
  },
  message: {
    fontFamily: FONTS.bodyBold,
    fontSize: 19,
    lineHeight: 26,
    textAlign: "center",
    color: SOAPBOX.marker,
  },
  detail: {
    fontFamily: FONTS.body,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});
