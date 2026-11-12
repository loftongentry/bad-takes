import { useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FONTS, SOAPBOX } from "./soapbox/tokens";

const CODE_LENGTH = 5;
// Typed letters land on little paper tiles, each a bit crooked like a ransom note
const TILE_TILT = [-4, 3, -2, 4, -3];

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

  const boxes = Array.from({ length: CODE_LENGTH }).map((_, i) => sanitized[i] ?? "");
  const isComplete = sanitized.length === CODE_LENGTH;

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      <View style={styles.tiles}>
        {boxes.map((ch, idx) => {
          const isActive = !isComplete && idx === sanitized.length;
          return (
            <View
              key={idx}
              style={[
                styles.tile,
                ch ? [styles.filled, { transform: [{ rotate: `${TILE_TILT[idx]}deg` }] }] : null,
                isActive ? styles.active : null,
              ]}
            >
              <Text style={styles.letter}>{ch}</Text>
            </View>
          );
        })}
      </View>

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
  tiles: { flexDirection: "row", justifyContent: "center", gap: 8 },
  tile: {
    flex: 1,
    maxWidth: 56,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(31, 26, 23, 0.35)",
    borderRadius: 4,
    backgroundColor: "rgba(31, 26, 23, 0.05)",
  },
  filled: {
    borderStyle: "solid",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    backgroundColor: SOAPBOX.paper,
    boxShadow: `2px 3px 0px ${SOAPBOX.marker}`,
  },
  active: {
    borderStyle: "solid",
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    backgroundColor: SOAPBOX.caution,
  },
  letter: { fontFamily: FONTS.heading, fontSize: 26, color: SOAPBOX.marker },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
