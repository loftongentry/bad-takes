import type { ReactNode, Ref } from "react";
import { Pressable, StyleSheet, Text, type PressableInstance } from "react-native";
import { FONTS, SOAPBOX } from "./tokens";

type Variant = "primary" | "caution" | "outline";

const LOOKS: Record<Variant, { box: object; text: string }> = {
  // Marker-black block: the main action on a screen
  primary: {
    box: { backgroundColor: SOAPBOX.marker, boxShadow: `3px 4px 0px ${SOAPBOX.kraftDark}` },
    text: SOAPBOX.paper,
  },
  // Caution yellow: the other main action, when a screen has two
  caution: {
    box: { backgroundColor: SOAPBOX.caution, boxShadow: `3px 4px 0px ${SOAPBOX.marker}` },
    text: SOAPBOX.marker,
  },
  // Marker outline on the cardboard: lesser actions
  outline: { box: { backgroundColor: "transparent" }, text: SOAPBOX.marker },
};

// Chunky uppercase button that presses down into its shadow
export const SoapboxButton = ({
  children,
  onPress,
  variant = "primary",
  disabled,
  icon,
  ref,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  icon?: ReactNode;
  ref?: Ref<PressableInstance>;
}) => {
  const look = LOOKS[variant];
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        look.box,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      {typeof children === "string" ? (
        <Text style={[styles.label, { color: look.text }]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    borderRadius: 4,
  },
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
    boxShadow: `1px 1px 0px ${SOAPBOX.marker}`,
  },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
