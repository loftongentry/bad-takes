import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Minus, Plus } from "@tamagui/lucide-icons";
import Animated from "react-native-reanimated";
import { popIn } from "./motion";
import { FONTS, NO_WEB_OUTLINE, SOAPBOX } from "./tokens";

// One labelled line inside a Board: the label on the left, a control on the right
export const FieldRow = ({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) => (
  <View style={[styles.row, last ? null : styles.rowDivider]}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

// A text field written on a line, for the right side of a FieldRow. No placeholder: the row's
// label already says what goes here.
export const InlineTextInput = ({
  value,
  onChangeText,
  maxLength,
  accessibilityLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
  accessibilityLabel: string;
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      maxLength={maxLength}
      autoCorrect={false}
      accessibilityLabel={accessibilityLabel}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[styles.input, NO_WEB_OUTLINE, focused ? styles.inputFocused : null]}
    />
  );
};

const StepButton = ({
  onPress,
  disabled,
  label,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => [
      styles.step,
      pressed && !disabled ? styles.stepPressed : null,
      disabled ? styles.stepDisabled : null,
    ]}
  >
    {children}
  </Pressable>
);

// − value + inside a FieldRow
export const Stepper = ({
  label,
  valueText,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
  last,
}: {
  label: string;
  valueText: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  last?: boolean;
}) => (
  <FieldRow label={label} last={last}>
    <View style={styles.stepper}>
      <StepButton onPress={onDecrement} disabled={decrementDisabled} label={`Less ${label}`}>
        <Minus color={SOAPBOX.marker} size={18} />
      </StepButton>
      <Animated.Text key={valueText} entering={popIn()} style={styles.value}>
        {valueText}
      </Animated.Text>
      <StepButton onPress={onIncrement} disabled={incrementDisabled} label={`More ${label}`}>
        <Plus color={SOAPBOX.marker} size={18} />
      </StepButton>
    </View>
  </FieldRow>
);

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowDivider: { borderBottomWidth: 1.5, borderBottomColor: "rgba(31, 26, 23, 0.16)" },
  label: { fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker, flexShrink: 0 },
  input: {
    flex: 1,
    minWidth: 0,
    maxWidth: 170, // so fields in the same Board line up whatever their label's length
    paddingVertical: 6,
    fontFamily: FONTS.bodyBold,
    fontSize: 16,
    textAlign: "right",
    color: SOAPBOX.marker,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(31, 26, 23, 0.3)",
  },
  inputFocused: { borderBottomColor: SOAPBOX.marker },
  stepper: { flexDirection: "row", alignItems: "center" },
  step: {
    width: 42,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    borderRadius: 4,
    backgroundColor: SOAPBOX.paper,
    boxShadow: `2px 3px 0px ${SOAPBOX.marker}`,
  },
  stepPressed: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
    boxShadow: `0px 0px 0px ${SOAPBOX.marker}`,
  },
  stepDisabled: { opacity: 0.3 },
  value: {
    minWidth: 58,
    fontFamily: FONTS.heading,
    fontSize: 17,
    textAlign: "center",
    color: SOAPBOX.marker,
  },
});
