import { useEffect, type ReactNode } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { play, type SoundName } from "../../audio/sfx";
import Animated, {
  Easing,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  interpolate,
  Keyframe,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import { useSettingsStore } from "../../state/settingsStore";

// Motion for the Soapbox look. Everyday screens move gently (things settle onto the board);
// the big moments (a take being revealed, a vote, the results) move a lot more. Every animation
// is short, never holds up a phase change from the server, and is skipped when the phone is set
// to reduce motion.

// Everyday: drops a few points onto the board and settles with a little give
export const settleIn = (delay = 0) =>
  FadeInDown.springify().damping(16).stiffness(170).delay(delay);

// A quick overshooting pop, for letters landing on tiles and numbers changing
export const popIn = (delay = 0) => ZoomIn.springify().damping(9).stiffness(260).delay(delay);

// Lists of players: newcomers slide in, leavers slide out, and the rest close the gap
export const listEnter = FadeInRight.springify().damping(15);
export const listExit = FadeOutLeft.duration(200);
export const listReflow = LinearTransition.springify().damping(18);

// A finished sign gets tossed off the top of the screen (used as an `exiting` animation)
export const throwOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }, { rotate: "0deg" }] },
  100: {
    opacity: 0,
    transform: [{ translateY: -700 }, { rotate: "16deg" }],
    easing: Easing.in(Easing.cubic),
  },
}).duration(420);

// --- Big moments ---------------------------------------------------------------------------
// These run as animated styles rather than Reanimated `entering` keyframes. On the web, a custom
// keyframe entrance gets pinned in place with position: absolute a few seconds after it plays,
// which pulls it out of the layout (the End Defense button slid up under the take sign). An
// animated style has no such side effect, and its end state stays put.

type Frame = {
  at: number; // 0 to 1 through the animation
  opacity: number;
  translateY: number;
  rotate: number; // degrees
  scaleX: number;
  scaleY: number;
};
// `hit`: the moment it lands (0 to 1 through the animation), the sound it makes, and whether
// phones thud
type FlourishSpec = {
  frames: Frame[];
  duration: number;
  hit: { at: number; sound: SoundName; haptic: boolean };
};

type FrameValues = {
  opacity?: number;
  translateY?: number;
  rotate?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
};
const frame = (at: number, values: FrameValues): Frame => {
  const { opacity = 1, translateY = 0, rotate = 0, scale = 1 } = values;
  const { scaleX = scale, scaleY = scale } = values;
  return { at, opacity, translateY, rotate, scaleX, scaleY };
};

export const FLOURISHES = {
  // A title punches in, overshoots, and snaps back
  punch: {
    duration: 520,
    hit: { at: 0.45, sound: "punch", haptic: false },
    frames: [
      frame(0, { opacity: 0, scale: 2.2, rotate: -6 }),
      frame(0.1, { scale: 1.9, rotate: -4 }),
      frame(0.45, { scale: 0.88, rotate: 2 }),
      frame(0.7, { scale: 1.06, rotate: -1 }),
      frame(1, {}),
    ],
  },
  // A sign falls onto the board (speeding up), squashes on impact, and bounces back into shape
  slam: {
    duration: 700,
    hit: { at: 0.55, sound: "slam", haptic: true },
    frames: [
      frame(0, { opacity: 0, translateY: -420, rotate: -9, scale: 1.08 }),
      frame(0.05, { translateY: -418, rotate: -9, scale: 1.08 }),
      frame(0.3, { translateY: -300, rotate: -6, scale: 1.08 }),
      frame(0.45, { translateY: -130, rotate: -2, scale: 1.08 }),
      frame(0.55, { translateY: 0, rotate: 2, scaleX: 1.07, scaleY: 0.88 }),
      frame(0.75, { translateY: -10, rotate: -1, scaleX: 0.97, scaleY: 1.04 }),
      frame(1, {}),
    ],
  },
  // A rubber stamp hits the sign, from big and faint to small and inked, ending crooked
  stamp: {
    duration: 620,
    hit: { at: 0.6, sound: "stamp", haptic: true },
    frames: [
      frame(0, { opacity: 0, scale: 2.6, rotate: -22 }),
      frame(0.15, { opacity: 0.6, scale: 2.2, rotate: -19 }),
      frame(0.6, { scale: 0.9, rotate: -10 }),
      frame(1, { rotate: -12 }),
    ],
  },
} satisfies Record<string, FlourishSpec>;

// Plays one of the FLOURISHES once, when it first appears (give it a new `key` to replay it),
// with its sound (and haptic thud) as it lands. Until its delay is up it's invisible but
// already takes its place in the layout. With reduced motion it's shown in place at once, but
// the sound still plays.
export const Flourish = ({
  kind,
  delay = 0,
  silent = false,
  style,
  children,
}: {
  kind: keyof typeof FLOURISHES;
  delay?: number;
  // No sound or thud (the Motion lab's first, automatic play)
  silent?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) => {
  const { frames, duration, hit } = FLOURISHES[kind];
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.linear }));
  }, [reduceMotion, delay, duration, progress]);

  // The sound (and thud) when it lands
  useEffect(() => {
    if (silent) {
      return;
    }
    const landing = setTimeout(
      () => {
        play(hit.sound);
        if (hit.haptic) {
          thud();
        }
      },
      delay + duration * hit.at,
    );
    return () => clearTimeout(landing);
  }, [delay, duration, hit, silent]);

  const at = frames.map((f) => f.at);
  const track = (key: Exclude<keyof Frame, "at">) => frames.map((f) => f[key]);
  const opacity = track("opacity");
  const translateY = track("translateY");
  const rotate = track("rotate");
  const scaleX = track("scaleX");
  const scaleY = track("scaleY");

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, at, opacity),
    transform: [
      { translateY: interpolate(progress.value, at, translateY) },
      { rotate: `${interpolate(progress.value, at, rotate)}deg` },
      { scaleX: interpolate(progress.value, at, scaleX) },
      { scaleY: interpolate(progress.value, at, scaleY) },
    ],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
};

// A firm haptic tap on phones; nothing on the web, where haptics aren't available, or when the
// player turned vibration off
export const thud = () => {
  if (Platform.OS === "web" || !useSettingsStore.getState().haptics) {
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
};
