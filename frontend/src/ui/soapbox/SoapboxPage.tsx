import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "@tamagui/lucide-icons";
import { useGameSessionStore } from "../../state/gameSessionStore";
import { goHome } from "../../navigation/home";
import Animated from "react-native-reanimated";
import { KraftBackground } from "./KraftBackground";
import { punchIn, settleIn } from "./motion";
import { FONTS, SOAPBOX } from "./tokens";

const BackButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Back"
    hitSlop={6}
    style={({ pressed }) => [styles.back, pressed ? styles.backPressed : null]}
  >
    <ArrowLeft color={SOAPBOX.marker} size={22} />
  </Pressable>
);

// A screen in the Soapbox look: cardboard background, a top bar (back button on the left, an
// optional item such as the host's Players button on the right), a title and subtitle, then the
// screen's content in a centered column that scrolls when it doesn't fit.
export const SoapboxPage = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  headerRight,
  titleEntrance = "settle",
  children,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  // Defaults to leaving for the home screen
  onBack?: () => void;
  headerRight?: ReactNode;
  // How the title arrives: settles in gently, or punches in for the game's big moments.
  // It replays whenever the title changes (e.g. "Get Ready!" becoming "DEFEND THIS!").
  titleEntrance?: "settle" | "punch";
  children: ReactNode;
}) => {
  const clearSession = useGameSessionStore((s) => s.clearSession);
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().height < 740;

  const leave = () => {
    clearSession();
    goHome();
  };

  return (
    <View style={styles.screen}>
      <KraftBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <View style={styles.topBar}>
            {showBack ? <BackButton onPress={onBack ?? leave} /> : <View />}
            {headerRight}
          </View>

          <Animated.Text
            key={title}
            entering={titleEntrance === "punch" ? punchIn : settleIn()}
            style={[styles.title, compact ? styles.titleCompact : null]}
            accessibilityRole="header"
          >
            {title}
          </Animated.Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {/* Room for a Board's tape label, which sticks up above its top edge */}
          <View style={{ height: 30 }} />

          {children}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SOAPBOX.kraft },
  scroll: { flexGrow: 1 },
  column: { width: "100%", maxWidth: 380, alignSelf: "center", paddingHorizontal: 24 },
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    borderRadius: 4,
    backgroundColor: SOAPBOX.paper,
    boxShadow: `2px 3px 0px ${SOAPBOX.marker}`,
  },
  backPressed: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
    boxShadow: `0px 0px 0px ${SOAPBOX.marker}`,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 40,
    lineHeight: 44,
    textAlign: "center",
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
  titleCompact: { fontSize: 32, lineHeight: 36 },
  subtitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
});
