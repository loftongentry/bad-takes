import type { Ref } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Dialog } from "tamagui";
import { Users } from "@tamagui/lucide-icons";
import { useGameSessionStore } from "../state/gameSessionStore";
import { useRoomActions } from "../hooks/useRoomActions";
import type { Room } from "../graphql/types";
import { NoticeDialog } from "./soapbox/NoticeDialog";
import { SoapboxButton } from "./soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "./soapbox/tokens";

// The small paper button that opens the menu. Dialog.Trigger passes its onPress (and a ref) in
// through props, so the button keeps its own styling here rather than in the trigger's child.
const PlayersButton = ({ onPress, ref }: { onPress?: () => void; ref?: Ref<View> }) => (
  <Pressable
    ref={ref}
    onPress={onPress}
    accessibilityRole="button"
    aria-label="Players"
    style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
  >
    <Users color={SOAPBOX.marker} size={18} />
    <Text style={styles.triggerText}>Players</Text>
  </Pressable>
);

// A "Players" button for the host on in-game screens, opening a list where they can remove a
// player mid-game (someone who wandered off or whose phone died). Renders nothing for others.
export const HostPlayersMenu = ({ room }: { room: Room | null }) => {
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);
  const { kickPlayer } = useRoomActions(room?.id);

  const amHost = !!room?.players.find((p) => p.id === myPlayerId)?.isHost;
  if (!room || !amHost) {
    return null;
  }

  const handleRemove = async (playerId: string) => {
    try {
      await kickPlayer(playerId);
    } catch (error) {
      console.error("Error removing player:", error);
      alert("Failed to remove player. Please try again.");
    }
  };

  return (
    <Dialog modal>
      <Dialog.Trigger asChild>
        <PlayersButton />
      </Dialog.Trigger>
      <NoticeDialog title="Players">
        <Text style={styles.intro}>
          Remove someone who has left or stopped responding so the game can carry on.
        </Text>

        {room.players.map((p) => (
          <View key={p.id} style={styles.row}>
            <Text style={styles.name}>
              {p.name}
              {p.id === myPlayerId ? " (you)" : ""}
            </Text>
            {p.id !== myPlayerId ? (
              <Pressable
                onPress={() => handleRemove(p.id)}
                accessibilityRole="button"
                aria-label={`Remove ${p.name}`}
                style={({ pressed }) => [styles.remove, pressed ? { opacity: 0.6 } : null]}
              >
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <View style={{ marginTop: 14 }}>
          <Dialog.Close asChild>
            <SoapboxButton>Close</SoapboxButton>
          </Dialog.Close>
        </View>
      </NoticeDialog>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  trigger: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderWidth: 2.5,
    borderColor: SOAPBOX.marker,
    borderRadius: 4,
    backgroundColor: SOAPBOX.paper,
    boxShadow: `2px 3px 0px ${SOAPBOX.marker}`,
  },
  triggerPressed: {
    transform: [{ translateX: 2 }, { translateY: 3 }],
    boxShadow: `0px 0px 0px ${SOAPBOX.marker}`,
  },
  triggerText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: SOAPBOX.marker },
  intro: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    color: SOAPBOX.markerSoft,
    marginBottom: 6,
  },
  row: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(31, 26, 23, 0.14)",
  },
  name: { flexShrink: 1, fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker },
  remove: {
    height: 36,
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: SOAPBOX.boo,
    borderRadius: 4,
  },
  removeText: { fontFamily: FONTS.heading, fontSize: 13, color: SOAPBOX.boo },
});
