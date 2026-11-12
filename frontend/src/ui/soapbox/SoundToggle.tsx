import { Pressable, StyleSheet } from "react-native";
import { Volume2, VolumeX } from "@tamagui/lucide-icons";
import { useSettingsStore } from "../../state/settingsStore";
import { play } from "../../audio/sfx";
import { SOAPBOX } from "./tokens";

// Paper speaker button that mutes and unmutes the game's sounds (remembered on the device)
export const SoundToggle = () => {
  const muted = useSettingsStore((s) => s.muted);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);

  const toggle = () => {
    toggleMuted();
    if (muted) {
      // Turning sound back on: a click confirms it works
      play("tap");
    }
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={muted ? "Turn sounds on" : "Mute sounds"}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      {muted ? (
        <VolumeX color={SOAPBOX.marker} size={22} />
      ) : (
        <Volume2 color={SOAPBOX.marker} size={22} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
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
  pressed: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
    boxShadow: `0px 0px 0px ${SOAPBOX.marker}`,
  },
});
