import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useRevealStore } from "../state/revealStore";
import { Sign } from "./soapbox/Sign";
import { takeTextStyle } from "./soapbox/TakeSign";
import { Flourish } from "./soapbox/motion";
import { FONTS, SOAPBOX } from "./soapbox/tokens";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// "+2 · 3 cheers, 1 boo"
const verdict = (score: number, cheers: number, boos: number) =>
  `${score > 0 ? "+" : ""}${score} ${score === 1 || score === -1 ? "pt" : "pts"} · ${plural(cheers, "cheer")}, ${plural(boos, "boo")}`;

// The "who wrote it" card, over whatever screen is up, once a take's voting closes in a room that
// reveals authors (see revealStore). Rendered once, in the root layout. Tap to dismiss.
export const TakeRevealHost = () => {
  const reveal = useRevealStore((s) => s.current);
  const dismiss = useRevealStore((s) => s.dismiss);
  if (!reveal) {
    return null;
  }

  const ownTake = reveal.authorName === reveal.defenderName;

  return (
    <Animated.View
      key={reveal.id}
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(220)}
      style={styles.scrim}
    >
      <Pressable
        onPress={dismiss}
        style={styles.fill}
        accessibilityRole="button"
        accessibilityLabel={`Written by ${reveal.authorName}. Tap to close.`}
      >
        <View style={styles.column}>
          <Flourish kind="slam" delay={120}>
            <Sign tilt={-2}>
              <Text style={styles.kicker}>Written by</Text>
              <Flourish kind="stamp" delay={650}>
                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                  {reveal.authorName}
                </Text>
              </Flourish>
              <Text style={[takeTextStyle, styles.take]} numberOfLines={4}>
                “{reveal.promptText}”
              </Text>
              <Text style={styles.verdict}>
                {ownTake
                  ? `${reveal.defenderName} defended their own take!`
                  : `Defended by ${reveal.defenderName}`}
              </Text>
              <Text style={styles.verdict}>
                {verdict(reveal.score, reveal.cheers, reveal.boos)}
              </Text>
            </Sign>
          </Flourish>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    backgroundColor: "rgba(31, 26, 23, 0.72)",
  },
  fill: { flex: 1, justifyContent: "center", padding: 24 },
  column: { width: "100%", maxWidth: 380, alignSelf: "center" },
  kicker: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
  name: {
    marginTop: 4,
    marginBottom: 12,
    fontFamily: FONTS.heading,
    fontSize: 44,
    textTransform: "uppercase",
    textAlign: "center",
    color: SOAPBOX.boo,
  },
  take: { fontSize: 19, lineHeight: 25, marginBottom: 12 },
  verdict: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});
