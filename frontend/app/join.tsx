import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { RoomCodeInput } from "../src/ui/RoomCodeInput";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { Board } from "../src/ui/soapbox/Board";
import { FieldRow, InlineTextInput } from "../src/ui/soapbox/Form";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
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
    <SoapboxPage title="Join Game" onBack={() => router.back()}>
      <Board label="Room code">
        <RoomCodeInput value={roomCode} onChange={setRoomCode} />
        <Text style={styles.hint}>The 5-character code on the host’s screen</Text>
      </Board>

      <Board delay={120} style={{ marginTop: 24 }}>
        <FieldRow label="Your Name" last>
          <InlineTextInput
            value={yourName}
            onChangeText={setYourName}
            maxLength={rules?.playerNameMaxLength}
            accessibilityLabel="Your name"
          />
        </FieldRow>
      </Board>

      <View style={{ marginTop: 28 }}>
        <SoapboxButton variant="caution" onPress={handleJoinLobby} disabled={!canJoin || loading}>
          {loading ? <ActivityIndicator color={SOAPBOX.marker} /> : "Join Lobby"}
        </SoapboxButton>
      </View>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  hint: {
    fontFamily: FONTS.body,
    fontSize: 14,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
    marginBottom: 10,
  },
});

export default JoinScreen;
