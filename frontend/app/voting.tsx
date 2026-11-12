// TODO: Instead of just showing a spinner after voting, show the list of players, with an indicator of who has voted and who hasn't.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { HostPlayersMenu } from "../src/ui/HostPlayersMenu";
import { TakeSign } from "../src/ui/soapbox/TakeSign";
import { VoteStamp } from "../src/ui/soapbox/VoteStamp";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import { Flourish, settleIn, thud } from "../src/ui/soapbox/motion";
import { useGameSessionStore } from "../src/state/gameSessionStore";
import { useRoom } from "../src/hooks/useRoom";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useSecondsLeft } from "../src/hooks/useSecondsLeft";
import type { Room } from "../src/graphql/types";

// "Voting closes in 12s"; the server counts whatever votes are in when it hits zero
const closesIn = (secondsLeft: number | null) =>
  secondsLeft === null ? undefined : `Voting closes in ${secondsLeft}s`;

// How long the vote stamp stays on screen before "Vote Locked In" replaces it, so the stamp is
// seen landing. Local to this player's screen: the vote itself is sent straight away.
const STAMP_HOLD_MS = 700;

const STAMP = {
  down: { word: "BOO", color: SOAPBOX.boo },
  up: { word: "CHEER", color: SOAPBOX.cheer },
} as const;

// The inked mark a vote stamp leaves on the sign
const StampMark = ({ kind }: { kind: keyof typeof STAMP }) => (
  <View style={styles.markLayer} pointerEvents="none">
    <Flourish kind="stamp" style={[styles.mark, { borderColor: STAMP[kind].color }]}>
      <View style={[styles.markInner, { borderColor: STAMP[kind].color }]}>
        <Text style={[styles.markWord, { color: STAMP[kind].color }]}>{STAMP[kind].word}</Text>
      </View>
    </Flourish>
  </View>
);

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
  // The stamp this player pressed in this round, while it's landing on the sign
  const [stamp, setStamp] = useState<{ round: string | null; kind: "down" | "up" } | null>(null);
  const [stampLanding, setStampLanding] = useState(false);
  const shownStamp = stamp && stamp.round === votingRound ? stamp.kind : null;

  const hasVoted =
    (votedOnServer || (votingRound !== null && votedRound === votingRound)) && !stampLanding;

  const handleVote = async (value: number) => {
    const round = votingRound;
    setStamp({ round, kind: value > 0 ? "up" : "down" });
    setStampLanding(true);
    thud();
    setLoading(true);
    const pressedAt = Date.now();
    try {
      await submitVote(value);
      setVotedRound(round);
      // Let the stamp finish landing before switching to "Vote Locked In"
      setTimeout(
        () => setStampLanding(false),
        Math.max(0, STAMP_HOLD_MS - (Date.now() - pressedAt)),
      );
    } catch (error) {
      setStamp(null);
      setStampLanding(false);
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
      titleEntrance="punch"
      showBack={false}
    >
      <Text style={styles.question}>
        Did <Text style={styles.name}>{defenderName}</Text> defend this well?
      </Text>
      {secondsLeft !== null ? <Text style={styles.clock}>{closesIn(secondsLeft)}</Text> : null}

      <Animated.View entering={settleIn(80)} style={{ marginTop: 22 }}>
        <TakeSign text={currentTurn?.promptText ?? ""} />
        {shownStamp ? <StampMark kind={shownStamp} /> : null}
      </Animated.View>

      <Animated.View entering={settleIn(180)} style={styles.stamps}>
        <VoteStamp kind="down" onPress={() => handleVote(-1)} disabled={loading || !!shownStamp} />
        <VoteStamp kind="up" onPress={() => handleVote(1)} disabled={loading || !!shownStamp} />
      </Animated.View>
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
  // Drawn over the sign (the sign's cardboard must not be stacked above it)
  markLayer: {
    zIndex: 2,
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    padding: 4,
    borderWidth: 5,
    borderRadius: 6,
    backgroundColor: "rgba(243, 231, 214, 0.35)",
  },
  markInner: { paddingHorizontal: 18, paddingVertical: 6, borderWidth: 2, borderRadius: 3 },
  markWord: { fontFamily: FONTS.heading, fontSize: 44, letterSpacing: 2 },
  stamps: { flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 34 },
});

export default Voting;
