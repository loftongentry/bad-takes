import { useState } from "react";
import { useRouter } from "expo-router";
import { View, Spinner } from "tamagui";
import { PrimaryButton } from "../src/ui/PrimaryButton";
import { RoomCodeInput } from "../src/ui/RoomCodeInput";
import { LabeledField } from "../src/ui/LabeledField";
import { ActionRow } from "../src/ui/ActionRow";
import { Page } from "../src/ui/Page";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";

const JoinScreen = () => {
  const router = useRouter();
  const { joinGame } = useRoomActions();
  const rules = useRules();
  const [roomCode, setRoomCode] = useState<string>("");
  const [yourName, setYourName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const canJoin = roomCode.length === 5 && yourName.trim().length > 0;

  const handleJoinLobby = async () => {
    try {
      setLoading(true);
      await joinGame(roomCode, yourName);

      router.push(`/lobby`);
    } catch (error) {
      console.error("Error joining lobby:", error);
      alert("Failed to join lobby. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Join Game" onBack={() => router.back()}>
      <View style={{ width: "100%", maxWidth: 340 }}>
        <RoomCodeInput value={roomCode} onChange={setRoomCode} />
      </View>

      <View style={{ height: 26 }} />

      <LabeledField
        label="Your Name"
        value={yourName}
        onChangeText={setYourName}
        placeholder="Enter name"
        maxLength={rules?.playerNameMaxLength}
      />

      <ActionRow>
        <PrimaryButton onPress={handleJoinLobby} disabled={!canJoin || loading} invert>
          {loading ? <Spinner /> : "Join Lobby"}
        </PrimaryButton>
      </ActionRow>
    </Page>
  );
};

export default JoinScreen;
