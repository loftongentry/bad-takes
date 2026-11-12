import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

// A flat cardboard panel that holds a group of controls, with an optional strip of caution tape
// across its top-left corner as a label ("The room", "House rules")
export const Board = ({
  label,
  children,
  style,
}: {
  label?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.board, label ? styles.labelled : null, style]}>
    {label ? (
      <View style={styles.label}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    ) : null}
    {children}
  </View>
);

const styles = StyleSheet.create({
  board: {
    width: "100%",
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: SOAPBOX.kraftLight,
    borderWidth: 2,
    borderColor: SOAPBOX.kraftDark,
    borderRadius: 3,
    boxShadow: `4px 5px 0px ${SOAPBOX.kraftDark}`,
  },
  labelled: { paddingTop: 20 },
  label: {
    position: "absolute",
    top: -14,
    left: 12,
    height: 26,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: SOAPBOX.caution,
    boxShadow: "0px 2px 0px rgba(31, 26, 23, 0.2)",
    transform: [{ rotate: "-2deg" }],
  },
  labelText: {
    fontFamily: FONTS.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
});
