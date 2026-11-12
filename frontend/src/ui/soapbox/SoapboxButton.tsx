import type { ReactNode, Ref } from "react";
import { Pressable, StyleSheet, Text, type PressableInstance } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
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

// Chunky uppercase button that presses down into its shadow and springs back up
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
  // 0 = resting, 1 = pushed into the shadow; springs back with a little bounce on release
  const press = useSharedValue(0);
  const move = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value * 2 }, { translateY: press.value * 3 }],
  }));

  return (
    <Animated.View style={move}>
      <Pressable
        ref={ref}
        onPress={onPress}
        onPressIn={() => {
          press.value = withSpring(1, { damping: 30, stiffness: 900 });
        }}
        onPressOut={() => {
          press.value = withSpring(0, { damping: 8, stiffness: 320 });
        }}
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
    </Animated.View>
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
  // The movement is animated above; pressing also flattens the shadow
  pressed: { boxShadow: `1px 1px 0px ${SOAPBOX.marker}` },
  disabled: { opacity: 0.45 },
  label: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});
