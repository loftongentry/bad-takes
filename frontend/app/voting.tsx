// TODO: Instead of just showing a spinner after voting, show the list of players, with an indicator of who has voted and who hasn't.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { TakeSign } from "../src/ui/soapbox/TakeSign";
import { VoteStamp } from "../src/ui/soapbox/VoteStamp";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useSecondsLeft } from "../src/hooks/useSecondsLeft";
import type { Room } from "../src/graphql/types";

// "Voting closes in 12s"; the server counts whatever votes are in when it hits zero
const closesIn = (secondsLeft: number | null) =>
  secondsLeft === null ? undefined : `Voting closes in ${secondsLeft}s`;

// Shown to the defender while the jury votes, and to voters after they've voted
const WaitingPage = ({
  room,
  title,
  message,
  secondsLeft,
  onBack,
}: {
  room: Room | null;
  title: string;
  message: string;
  secondsLeft: number | null;
  onBack: () => void;
}) => (
  <SoapboxPage headerRight={<HostPlayersMenu room={room} />} title={title} onBack={onBack}>
    <WaitingNote detail={closesIn(secondsLeft)}>{message}</WaitingNote>
  </SoapboxPage>
);

const Voting = () => {
  const roomId = useGameSessionStore((s) => s.session?.roomId ?? null);
  const myPlayerId = useGameSessionStore((s) => s.session?.playerId ?? null);

  const { room } = useRoom(roomId || undefined);
  const { leaveGame, submitVote } = useRoomActions(roomId || undefined);

  const [loading, setLoading] = useState<boolean>(false);

  const currentTurn = room?.gameState?.currentTurn;
  const isDefender = currentTurn?.defenderId === myPlayerId;
  const defenderName =
    room?.players.find((p) => p.id === currentTurn?.defenderId)?.name || "Defendant";

  // Each voting round has its own deadline; null until the room is actually voting
  // (before that, the deadline is still the defense's)
  const votingRound = room?.status === "VOTING" ? (room.gameState?.deadline ?? null) : null;
  const secondsLeft = useSecondsLeft(votingRound);

  // The server knows who has voted this round (it starts empty each turn). The local record of
  // the round this player voted in only covers the moment before the room update arrives, and
  // never carries over to the next turn if this screen stays open from one vote to the next.
  const [votedRound, setVotedRound] = useState<string | null>(null);
  const votedOnServer =
    room?.status === "VOTING" &&
    !!myPlayerId &&
    !!room.gameState?.votedPlayerIds.includes(myPlayerId);
  const hasVoted = votedOnServer || (votingRound !== null && votedRound === votingRound);

  const handleVote = async (value: number) => {
    const round = votingRound;
    setLoading(true);
    try {
      await submitVote(value);
      setVotedRound(round);
    } catch (error) {
      console.error("Failed to submit vote:", error);
      alert("Failed to submit vote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isDefender) {
    return (
      <WaitingPage
        room={room}
        title="Judgement Time"
        message="The jury is deciding..."
        secondsLeft={secondsLeft}
        onBack={leaveGame}
      />
    );
  }

  if (hasVoted) {
    return (
      <WaitingPage
        room={room}
        title="Vote Locked In"
        message="Waiting for others to vote..."
        secondsLeft={secondsLeft}
        onBack={leaveGame}
      />
    );
  }

  return (
    <SoapboxPage
      headerRight={<HostPlayersMenu room={room} />}
      title="Cast Your Vote"
      showBack={false}
    >
      <Text style={styles.question}>
        Did <Text style={styles.name}>{defenderName}</Text> defend this well?
      </Text>
      {secondsLeft !== null ? <Text style={styles.clock}>{closesIn(secondsLeft)}</Text> : null}

      <View style={{ marginTop: 22 }}>
        <TakeSign text={currentTurn?.promptText ?? ""} />
      </View>

      <View style={styles.stamps}>
        <VoteStamp kind="down" onPress={() => handleVote(-1)} disabled={loading} />
        <VoteStamp kind="up" onPress={() => handleVote(1)} disabled={loading} />
      </View>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  question: {
    fontFamily: FONTS.bodyBold,
    fontSize: 20,
    lineHeight: 27,
    textAlign: "center",
    color: SOAPBOX.marker,
  },
  name: { fontFamily: FONTS.heading },
  clock: {
    marginTop: 6,
    fontFamily: FONTS.body,
    fontSize: 15,
    textAlign: "center",
    color: SOAPBOX.markerSoft,
  },
  stamps: { flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 34 },
});

export default Voting;
