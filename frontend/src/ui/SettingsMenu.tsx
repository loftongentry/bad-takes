import type { Ref } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableInstance } from "react-native";
import { Settings } from "@tamagui/lucide-icons";
import { Dialog } from "tamagui";
import { useSettingsStore } from "../state/settingsStore";
import { play } from "../audio/sfx";
import { thud } from "./soapbox/motion";
import { NoticeDialog } from "./soapbox/NoticeDialog";
import { ToggleRow } from "./soapbox/Form";
import { SoapboxButton } from "./soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "./soapbox/tokens";

// The gear button on Home and the settings it opens, all saved on this device. (Game screens
// keep a one-tap mute button instead.)
export const SettingsMenu = () => {
  const muted = useSettingsStore((s) => s.muted);
  const haptics = useSettingsStore((s) => s.haptics);
  const toggleMuted = useSettingsStore((s) => s.toggleMuted);
  const toggleHaptics = useSettingsStore((s) => s.toggleHaptics);

  const setSound = (on: boolean) => {
    toggleMuted();
    if (on) {
      play("tap"); // proof it works
    }
  };
  const setVibration = (on: boolean) => {
    toggleHaptics();
    if (on) {
      thud();
    }
  };
  // Browsers can't vibrate
  const canVibrate = Platform.OS !== "web";

  return (
    <Dialog modal>
      <Dialog.Trigger asChild>
        <SettingsButton />
      </Dialog.Trigger>
      <NoticeDialog title="Settings">
        <ToggleRow label="Sound" value={!muted} onChange={setSound} last={!canVibrate} />
        {canVibrate ? (
          <ToggleRow label="Vibration" value={haptics} onChange={setVibration} last />
        ) : null}
        <Text style={styles.note}>Saved on this device.</Text>
        <View style={{ marginTop: 14 }}>
          <Dialog.Close asChild>
            <SoapboxButton>Done</SoapboxButton>
          </Dialog.Close>
        </View>
      </NoticeDialog>
    </Dialog>
  );
};

// Its own component so Dialog.Trigger's asChild can pass it the press handler
const SettingsButton = ({
  onPress,
  ref,
}: {
  onPress?: () => void;
  ref?: Ref<PressableInstance>;
}) => (
  <Pressable
    ref={ref}
    onPress={onPress}
    accessibilityRole="button"
    aria-label="Settings"
    hitSlop={6}
    style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
  >
    <Settings color={SOAPBOX.marker} size={22} />
  </Pressable>
);

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
  note: {
    marginTop: 10,
    fontFamily: FONTS.body,
    fontSize: 13,
    color: SOAPBOX.markerSoft,
  },
});
