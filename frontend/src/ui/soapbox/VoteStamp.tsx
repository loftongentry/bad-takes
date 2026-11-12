import { Pressable, StyleSheet, Text, View } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

const LOOKS = {
  down: { word: "BOO", color: SOAPBOX.boo, tilt: -6, label: "Vote down: boo" },
  up: { word: "CHEER", color: SOAPBOX.cheer, tilt: 5, label: "Vote up: cheer" },
} as const;

// A rubber stamp for voting: BOO (−1) or CHEER (+1)
export const VoteStamp = ({
  kind,
  onPress,
  disabled,
}: {
  kind: keyof typeof LOOKS;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const look = LOOKS[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={look.label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.stamp,
        { borderColor: look.color, transform: [{ rotate: `${look.tilt}deg` }] },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View style={[styles.inner, { borderColor: look.color }]}>
        <Text style={[styles.word, { color: look.color }]}>{look.word}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  stamp: {
    flex: 1,
    maxWidth: 150,
    padding: 4,
    borderWidth: 4,
    borderRadius: 6,
    backgroundColor: "rgba(243, 231, 214, 0.55)",
  },
  inner: {
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 3,
  },
  word: { fontFamily: FONTS.heading, fontSize: 30, letterSpacing: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  disabled: { opacity: 0.45 },
});
