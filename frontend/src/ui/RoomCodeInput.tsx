import { useRef } from "react";
import { Pressable, StyleSheet, TextInput } from "react-native";
import { CodeTiles } from "./soapbox/CodeTiles";

const CODE_LENGTH = 5;

// Uppercase letters and digits only, at most CODE_LENGTH of them (so a pasted "ab-12-c" works)
const sanitize = (text: string) =>
  text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);

export const RoomCodeInput = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) => {
  const inputRef = useRef<TextInput>(null);

  // The parent only ever receives sanitized text (see onChangeText), so this is just a safeguard
  const sanitized = sanitize(value);
  const isComplete = sanitized.length === CODE_LENGTH;

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <CodeTiles
        code={sanitized}
        length={CODE_LENGTH}
        activeIndex={isComplete ? -1 : sanitized.length}
      />

      {/* Hidden input that actually captures typing/paste/backspace */}
      <TextInput
        ref={inputRef}
        value={sanitized}
        onChangeText={(text) => onChange(sanitize(text))}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        textContentType="oneTimeCode"
        accessibilityLabel="Room code"
        style={styles.hidden}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: { width: "100%", paddingVertical: 12 },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
