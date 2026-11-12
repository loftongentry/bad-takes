// Motion lab (development builds only): every animation and sound in the app on one screen, each
// with a button to play it again (demos are silent until replayed, so opening the lab is quiet), so motion can be tuned without playing a whole game. Open it from the
// link at the bottom of the Home screen. It uses the same components and presets as the game.
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { RotateCcw } from "@tamagui/lucide-icons";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { Board } from "../src/ui/soapbox/Board";
import { CautionTape } from "../src/ui/soapbox/CautionTape";
import { CodeTiles } from "../src/ui/soapbox/CodeTiles";
import { Stepper } from "../src/ui/soapbox/Form";
import { ResultsReveal } from "../src/ui/soapbox/ResultsReveal";
import { Sign } from "../src/ui/soapbox/Sign";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { TakeSign, takeTextStyle, type StampKind } from "../src/ui/soapbox/TakeSign";
import { TapeTimer } from "../src/ui/soapbox/TapeTimer";
import { VoteStamp } from "../src/ui/soapbox/VoteStamp";
import { WaitingNote } from "../src/ui/soapbox/WaitingNote";
import { Flourish, listEnter, listExit, listReflow, throwOut } from "../src/ui/soapbox/motion";
import { FONTS, SOAPBOX } from "../src/ui/soapbox/tokens";
import type { Player } from "../src/graphql/types";
import { play, SOUND_NAMES } from "../src/audio/sfx";
import { SoundToggle } from "../src/ui/soapbox/SoundToggle";

const SAMPLE_PLAYERS: Player[] = [
  { id: "1", name: "Hannah", isHost: true, score: 3 },
  { id: "2", name: "Gus", isHost: false, score: 2 },
  { id: "3", name: "Ivy", isHost: false, score: 1 },
  { id: "4", name: "Otto", isHost: false, score: 0 },
];
// Hannah and Gus tie for first, so they share the top crate
const TIED_PLAYERS: Player[] = [
  { id: "1", name: "Hannah", isHost: true, score: 2 },
  { id: "2", name: "Gus", isHost: false, score: 2 },
  { id: "3", name: "Ivy", isHost: false, score: 1 },
  { id: "4", name: "Otto", isHost: false, score: 0 },
];
const EXTRA_NAMES = ["Pip", "Rae", "Sol", "Tam", "Uma", "Vic"];

// A small paper button for the lab's controls
const LabButton = ({
  onPress,
  children,
  icon = true,
}: {
  onPress: () => void;
  children: ReactNode;
  icon?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    style={({ pressed }) => [styles.labButton, pressed ? { opacity: 0.6 } : null]}
  >
    {icon ? <RotateCcw size={14} color={SOAPBOX.marker} /> : null}
    <Text style={styles.labButtonText}>{children}</Text>
  </Pressable>
);

// One demo: a labelled panel, a note on where it's used, and its controls
const Demo = ({
  label,
  where,
  controls,
  children,
}: {
  label: string;
  where: string;
  controls?: ReactNode;
  children: ReactNode;
}) => (
  <Board label={label} style={styles.demo}>
    <Text style={styles.where}>{where}</Text>
    {controls ? <View style={styles.controls}>{controls}</View> : null}
    <View style={styles.stage}>{children}</View>
  </Board>
);

// A 15-second countdown on the tape timer. Give it a new key to start again.
const CountdownDemo = () => {
  const [seconds, setSeconds] = useState(15);
  useEffect(() => {
    const tick = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick);
  }, []);
  return (
    <TapeTimer
      fraction={seconds / 15}
      label={`0:${String(seconds).padStart(2, "0")}`}
      urgent={seconds < 10}
    />
  );
};

// Types a room code one character at a time, as on Join. Give it a new key to start again.
const TypingDemo = ({ code }: { code: string }) => {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    const tick = setInterval(() => {
      i += 1;
      setTyped(code.slice(0, i));
      if (i >= code.length) {
        clearInterval(tick);
      }
    }, 350);
    return () => clearInterval(tick);
  }, [code]);
  return <CodeTiles code={typed} activeIndex={typed.length < code.length ? typed.length : -1} />;
};

const MotionLab = () => {
  const router = useRouter();
  // Bumping a counter remounts its demo, which plays the animation again
  const [punch, setPunch] = useState(0);
  const [slam, setSlam] = useState(0);
  const [stamp, setStamp] = useState<{ kind: StampKind; run: number } | null>(null);
  const [tossed, setTossed] = useState(false);
  const [timerRun, setTimerRun] = useState(0);
  const [settle, setSettle] = useState(0);
  const [tilesRun, setTilesRun] = useState(0);
  const [players, setPlayers] = useState(SAMPLE_PLAYERS.slice(0, 3));
  const [stepper, setStepper] = useState(5);
  const [reveal, setReveal] = useState(0);
  const [revealTie, setRevealTie] = useState(false);

  if (!__DEV__) {
    return (
      <SoapboxPage title="Motion Lab" onBack={() => router.back()}>
        <Text style={styles.where}>The motion lab is only available in development builds.</Text>
      </SoapboxPage>
    );
  }

  const replaySlam = () => {
    setSlam((n) => n + 1);
  };
  const stampIt = (kind: StampKind) => {
    setStamp((s) => ({ kind, run: (s?.run ?? 0) + 1 }));
  };
  const addPlayer = () =>
    setPlayers((list) => {
      const name = EXTRA_NAMES[list.length % EXTRA_NAMES.length];
      return [...list, { id: `${name}-${Date.now()}`, name, isHost: false, score: 0 }];
    });
  const removePlayer = () => setPlayers((list) => (list.length > 1 ? list.slice(0, -1) : list));

  return (
    <SoapboxPage
      title="Motion Lab"
      subtitle="Every animation and sound in the game. Motion follows your phone's Reduce Motion setting."
      onBack={() => router.back()}
    >
      <Demo
        label="Sounds"
        where="Each sound on its own. The speaker button mutes them everywhere."
        controls={<SoundToggle />}
      >
        <View style={styles.soundGrid}>
          {SOUND_NAMES.map((name) => (
            <LabButton key={name} onPress={() => play(name)} icon={false}>
              {name}
            </LabButton>
          ))}
        </View>
      </Demo>

      <Demo label="Caution tape" where="Home screen. Scrolls on its own.">
        <View style={styles.tapeStage}>
          <CautionTape
            text="BAD TAKES AHEAD"
            direction="right"
            style={{ top: 12, transform: [{ rotate: "-3deg" }] }}
          />
          <CautionTape
            text="DO NOT CROSS"
            direction="left"
            style={{ bottom: 12, transform: [{ rotate: "2deg" }] }}
          />
        </View>
      </Demo>

      <Demo
        label="Title punch"
        where="Defense and Cast Your Vote titles."
        controls={<LabButton onPress={() => setPunch((n) => n + 1)}>Replay</LabButton>}
      >
        <Flourish key={punch} kind="punch" silent={punch === 0}>
          <Text style={styles.title}>Defend this!</Text>
        </Flourish>
      </Demo>

      <Demo
        label="Sign slam"
        where="Each defense turn, and the winner on Results. Phones thud on impact."
        controls={<LabButton onPress={replaySlam}>Replay</LabButton>}
      >
        <Flourish key={slam} kind="slam" silent={slam === 0}>
          <TakeSign text="Pineapple belongs on pizza" />
        </Flourish>
      </Demo>

      <Demo
        label="Vote stamp"
        where="Voting. Phones thud as the stamp hits."
        controls={
          <>
            <LabButton onPress={() => setStamp(null)}>Clear</LabButton>
          </>
        }
      >
        <TakeSign key={stamp?.run ?? 0} text="Cereal is a soup" stamp={stamp ? stamp.kind : null} />
        <View style={styles.stamps}>
          <VoteStamp kind="down" onPress={() => stampIt("down")} />
          <VoteStamp kind="up" onPress={() => stampIt("up")} />
        </View>
      </Demo>

      <Demo
        label="Sign toss"
        where="Writing, when a take is submitted."
        controls={
          <LabButton onPress={() => setTossed((t) => !t)}>
            {tossed ? "Bring it back" : "Toss it"}
          </LabButton>
        }
      >
        <View style={styles.tossStage}>
          {tossed ? null : (
            <Animated.View exiting={throwOut}>
              <Sign tilt={-1}>
                <Text style={[takeTextStyle, styles.tossText]}>Mondays are the best day</Text>
              </Sign>
            </Animated.View>
          )}
        </View>
      </Demo>

      <Demo
        label="Tape timer"
        where="Writing and Defense. Turns red and jolts each second for the last 10."
        controls={<LabButton onPress={() => setTimerRun((n) => n + 1)}>Restart</LabButton>}
      >
        <CountdownDemo key={timerRun} />
      </Demo>

      <Demo
        label="Settle in"
        where="Every screen's titles, panels and buttons."
        controls={<LabButton onPress={() => setSettle((n) => n + 1)}>Replay</LabButton>}
      >
        <View key={settle} style={{ gap: 26, paddingTop: 12 }}>
          <Board label="First panel">
            <Text style={styles.panelText}>Lands first</Text>
          </Board>
          <Board label="Second panel" delay={120}>
            <Text style={styles.panelText}>Lands a beat later</Text>
          </Board>
        </View>
      </Demo>

      <Demo
        label="Code tiles"
        where="Join (letters pop as you type) and Lobby (tiles dealt in)."
        controls={<LabButton onPress={() => setTilesRun((n) => n + 1)}>Replay</LabButton>}
      >
        <TypingDemo key={`typing-${tilesRun}`} code="K7PX2" />
        <View key={`deal-${tilesRun}`} style={{ marginTop: 16 }}>
          <CodeTiles code="K7PX2" large />
        </View>
      </Demo>

      <Demo
        label="Player list"
        where="Lobby, as players join and leave."
        controls={
          <>
            <LabButton onPress={addPlayer} icon={false}>
              Add
            </LabButton>
            <LabButton onPress={removePlayer} icon={false}>
              Remove
            </LabButton>
          </>
        }
      >
        {players.map((p) => (
          <Animated.View
            key={p.id}
            entering={listEnter}
            exiting={listExit}
            layout={listReflow}
            style={styles.playerRow}
          >
            <Text style={styles.panelText}>{p.name}</Text>
          </Animated.View>
        ))}
      </Demo>

      <Demo label="Waiting note" where="While waiting on other players. Sways on its own.">
        <WaitingNote detail="Starting in 42s at the latest.">Waiting on 2 players...</WaitingNote>
      </Demo>

      <Demo label="Stepper" where="Create. The number pops when it changes.">
        <Stepper
          label="Player Limit"
          valueText={String(stepper)}
          onDecrement={() => setStepper((n) => Math.max(2, n - 1))}
          onIncrement={() => setStepper((n) => Math.min(20, n + 1))}
          decrementDisabled={stepper <= 2}
          incrementDisabled={stepper >= 20}
          last
        />
      </Demo>

      <Demo label="Buttons" where="Everywhere. Press and hold, then let go.">
        <View style={{ gap: 14 }}>
          <SoapboxButton>Primary</SoapboxButton>
          <SoapboxButton variant="caution">Caution</SoapboxButton>
          <SoapboxButton variant="outline">Outline</SoapboxButton>
        </View>
      </Demo>

      <Demo
        label="Results reveal"
        where="Results. Crates rise 3rd to 1st, then the winner's sign slams down."
        controls={
          <>
            <LabButton
              onPress={() => {
                setRevealTie(false);
                setReveal((n) => n + 1);
              }}
            >
              Replay
            </LabButton>
            <LabButton
              onPress={() => {
                setRevealTie(true);
                setReveal((n) => n + 1);
              }}
            >
              Replay with a tie
            </LabButton>
          </>
        }
      >
        <ResultsReveal
          key={reveal}
          players={revealTie ? TIED_PLAYERS : SAMPLE_PLAYERS}
          silent={reveal === 0}
        />
      </Demo>
    </SoapboxPage>
  );
};

const styles = StyleSheet.create({
  demo: { marginBottom: 34 },
  soundGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  where: {
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
    color: SOAPBOX.markerSoft,
    marginTop: 4,
  },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  stage: { paddingVertical: 16 },
  labButton: {
    height: 36,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2,
    borderColor: SOAPBOX.marker,
    borderRadius: 4,
    backgroundColor: SOAPBOX.paper,
  },
  labButtonText: { fontFamily: FONTS.bodyBold, fontSize: 14, color: SOAPBOX.marker },
  tapeStage: { height: 110, overflow: "hidden", marginHorizontal: -18 },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 34,
    textAlign: "center",
    textTransform: "uppercase",
    color: SOAPBOX.marker,
  },
  stamps: { flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 24 },
  tossStage: { minHeight: 140 },
  tossText: { fontSize: 26, lineHeight: 32, paddingVertical: 6 },
  panelText: { fontFamily: FONTS.bodyBold, fontSize: 16, color: SOAPBOX.marker },
  playerRow: {
    minHeight: 48,
    justifyContent: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(31, 26, 23, 0.16)",
  },
});

export default MotionLab;
