import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SOAPBOX } from "./tokens";

// A cardboard sign: lighter board, tilted a little, taped at the top corners, with a hard
// shadow. `compact` trims it for short screens.
export const Sign = ({
  children,
  tilt = -2,
  compact = false,
  style,
}: {
  children: ReactNode;
  tilt?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) => (
  <View style={[styles.wrap, style]}>
    <View
      style={[
        styles.board,
        compact ? styles.boardCompact : null,
        { transform: [{ rotate: `${tilt}deg` }] },
      ]}
    >
      <View style={[styles.tape, styles.tapeLeft]} />
      <View style={[styles.tape, styles.tapeRight]} />
      {children}
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center" },
  board: {
    width: "100%",
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: SOAPBOX.kraftLight,
    borderWidth: 2,
    borderColor: SOAPBOX.kraftDark,
    borderRadius: 3,
    boxShadow: `5px 6px 0px ${SOAPBOX.kraftDark}`,
    zIndex: 1,
  },
  boardCompact: { paddingVertical: 20 },
  tape: {
    position: "absolute",
    top: -9,
    width: 58,
    height: 20,
    backgroundColor: SOAPBOX.tape,
  },
  tapeLeft: { left: -14, transform: [{ rotate: "-32deg" }] },
  tapeRight: { right: -14, transform: [{ rotate: "28deg" }] },
});
