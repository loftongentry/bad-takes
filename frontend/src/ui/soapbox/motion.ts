import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { Easing, FadeInDown, Keyframe, ZoomIn } from "react-native-reanimated";

// Motion for the Soapbox look. Everyday screens move gently (things settle onto the board);
// the big moments (a take being revealed, a vote, the results) move a lot more. Every animation
// is short, never holds up a phase change from the server, and is skipped when the phone is set
// to reduce motion (Reanimated's default for these presets).

// Everyday: drops a few points onto the board and settles with a little give
export const settleIn = (delay = 0) =>
  FadeInDown.springify().damping(16).stiffness(170).delay(delay);

// A quick overshooting pop, for letters landing on tiles and numbers changing
export const popIn = (delay = 0) => ZoomIn.springify().damping(9).stiffness(260).delay(delay);

// Big moment: a title punches in, overshoots, and snaps back
export const punchIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 2.2 }, { rotate: "-6deg" }] },
  45: {
    opacity: 1,
    transform: [{ scale: 0.88 }, { rotate: "2deg" }],
    easing: Easing.in(Easing.quad),
  },
  70: { opacity: 1, transform: [{ scale: 1.06 }, { rotate: "-1deg" }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: "0deg" }] },
}).duration(520);

// Big moment: a sign falls onto the board, squashes on impact, and bounces back into shape
export const slamIn = (delay = 0) =>
  new Keyframe({
    0: {
      opacity: 0,
      transform: [{ translateY: -420 }, { rotate: "-9deg" }, { scaleX: 1.08 }, { scaleY: 1.08 }],
    },
    55: {
      opacity: 1,
      transform: [{ translateY: 0 }, { rotate: "2deg" }, { scaleX: 1.07 }, { scaleY: 0.88 }],
      easing: Easing.in(Easing.quad),
    },
    75: {
      opacity: 1,
      transform: [{ translateY: -10 }, { rotate: "-1deg" }, { scaleX: 0.97 }, { scaleY: 1.04 }],
    },
    100: {
      opacity: 1,
      transform: [{ translateY: 0 }, { rotate: "0deg" }, { scaleX: 1 }, { scaleY: 1 }],
    },
  })
    .duration(700)
    .delay(delay);

// Big moment: a rubber stamp hits the sign, from big and faint to small and inked
export const stampIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 2.6 }, { rotate: "-22deg" }] },
  60: {
    opacity: 1,
    transform: [{ scale: 0.9 }, { rotate: "-10deg" }],
    easing: Easing.in(Easing.cubic),
  },
  100: { opacity: 1, transform: [{ scale: 1 }, { rotate: "-12deg" }] },
}).duration(380);

// A finished sign gets tossed off the top of the screen
export const throwOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }, { rotate: "0deg" }] },
  100: {
    opacity: 0,
    transform: [{ translateY: -700 }, { rotate: "16deg" }],
    easing: Easing.in(Easing.cubic),
  },
}).duration(420);

// A firm haptic tap on phones; nothing on the web or where haptics aren't available
export const thud = () => {
  if (Platform.OS === "web") {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};
