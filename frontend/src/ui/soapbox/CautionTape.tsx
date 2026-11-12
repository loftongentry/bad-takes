import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

// A strip of caution tape stretched across the screen. Decoration only: position it with
// `style` (top/bottom and a rotate transform) and it runs past both edges of the screen.
export const CautionTape = ({
  text = "CAUTION",
  style,
}: {
  text?: string;
  style?: StyleProp<ViewStyle>;
}) => {
  const repeated = Array.from({ length: 12 }, () => text).join("   ●   ");
  return (
    <View style={[styles.tape, style]} pointerEvents="none" aria-hidden>
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="clip">
        {repeated}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tape: {
    position: "absolute",
    left: -60,
    right: -60,
    height: 34,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: SOAPBOX.caution,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "rgba(31, 26, 23, 0.25)",
    boxShadow: "0px 3px 0px rgba(31, 26, 23, 0.18)",
  },
  text: {
    fontFamily: FONTS.heading,
    fontSize: 14,
    letterSpacing: 2,
    color: SOAPBOX.marker,
  },
});
