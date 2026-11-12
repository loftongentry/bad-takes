import { useRouter } from "expo-router";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated from "react-native-reanimated";
import { HowToPlay } from "../src/ui/HowToPlay";
import { useTrackHomeScreen } from "../src/navigation/home";
import { CautionTape } from "../src/ui/soapbox/CautionTape";
import { KraftBackground } from "../src/ui/soapbox/KraftBackground";
import { Sign } from "../src/ui/soapbox/Sign";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { settleIn } from "../src/ui/soapbox/motion";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";

const WelcomeScreen = () => {
  const router = useRouter();
  useTrackHomeScreen();
  // Short phones (an iPhone SE is 667 points tall) get a smaller sign and tape closer to the edges
  const compact = useWindowDimensions().height < 740;

  return (
    <View style={styles.screen}>
      <KraftBackground />
      <CautionTape
        text="BAD TAKES AHEAD"
        direction="right"
        style={[styles.tapeTop, compact ? styles.tapeTopCompact : null]}
      />
      <CautionTape
        text="DO NOT CROSS"
        direction="left"
        style={[styles.tapeBottom, compact ? styles.tapeBottomCompact : null]}
      />

      <View style={styles.content}>
        <Animated.View entering={settleIn(60)}>
          <Sign compact={compact}>
            <Text
              style={[styles.title, compact ? styles.titleCompact : null]}
              accessibilityRole="header"
            >
              Bad{"\n"}Takes
            </Text>
            <View style={styles.rule} />
            <Text style={styles.tagline}>Defend the indefensible.</Text>
          </Sign>
        </Animated.View>

        <View style={styles.actions}>
          <Animated.View entering={settleIn(220)}>
            <SoapboxButton onPress={() => router.push("/create")}>Create Game</SoapboxButton>
          </Animated.View>
          <Animated.View entering={settleIn(300)}>
            <SoapboxButton variant="caution" onPress={() => router.push("/join")}>
              Join Game
            </SoapboxButton>
          </Animated.View>
          <Animated.View entering={settleIn(380)}>
            <HowToPlay />
          </Animated.View>
          {/* Development builds only: a screen for replaying every animation */}
          {__DEV__ ? (
            <Text style={styles.devLink} onPress={() => router.push("/motion-lab")}>
              Motion lab (dev)
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: SOAPBOX.kraft },
  tapeTop: { top: 54, transform: [{ rotate: "-5deg" }] },
  tapeBottom: { bottom: 40, transform: [{ rotate: "3deg" }] },
  tapeTopCompact: { top: 14 },
  tapeBottomCompact: { bottom: 2 },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 1, // above the tape
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 64,
    lineHeight: 62,
    textAlign: "center",
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
  titleCompact: { fontSize: 50, lineHeight: 50 },
  rule: {
    width: 64,
    height: 4,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: SOAPBOX.marker,
    borderRadius: 2,
  },
  tagline: {
    fontFamily: FONTS.bodyBold,
    fontSize: 17,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
  actions: { marginTop: 36, gap: 14 },
  devLink: {
    alignSelf: "center",
    padding: 6,
    fontFamily: FONTS.bodyBold,
    fontSize: 14,
    textDecorationLine: "underline",
    color: SOAPBOX.markerSoft,
  },
});

export default WelcomeScreen;
