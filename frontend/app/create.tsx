import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SoapboxPage } from "../src/ui/soapbox/SoapboxPage";
import { Board } from "../src/ui/soapbox/Board";
import { FieldRow, InlineTextInput, Stepper } from "../src/ui/soapbox/Form";
import { SoapboxButton } from "../src/ui/soapbox/SoapboxButton";
import { SOAPBOX } from "../src/ui/soapbox/tokens";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import { useSettingsStore } from "../src/state/settingsStore";
import type { GameRules, Range } from "../src/graphql/types";
import { reportActionError } from "../src/ui/reportError";

const clamp = (n: number, { min, max }: Range) => Math.max(min, Math.min(max, n));

// Starting values for a new room (each kept within the server's allowed range)
const DEFAULTS = { rounds: 1, playerLimit: 5, timeLimit: 60, promptTimeLimit: 90 };
const STEP_SECONDS = 15;

// A stepper for a number limited to `range`. Takes the state setter itself and updates from
// the latest value, so quick repeated taps all count even before the screen re-renders.
const RangeStepper = ({
  label,
  value,
  setValue,
  range,
  step = 1,
  unit = "",
  last,
}: {
  label: string;
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  range: Range;
  step?: number;
  unit?: string;
  last?: boolean;
}) => (
  <Stepper
    label={label}
    valueText={`${value}${unit}`}
    decrementDisabled={value <= range.min}
    incrementDisabled={value >= range.max}
    onDecrement={() => setValue((current) => clamp(current - step, range))}
    onIncrement={() => setValue((current) => clamp(current + step, range))}
    last={last}
  />
);

const CreateForm = ({ rules }: { rules: GameRules }) => {
  const router = useRouter();
  const { createGame } = useRoomActions();
  const [lobbyName, setLobbyName] = useState<string>("");
  // TODO: Implement logic that handles multiple rounds instead of just 1
  const [rounds, setRounds] = useState(() => clamp(DEFAULTS.rounds, rules.rounds));
  const [playerLimit, setPlayerLimit] = useState(() =>
    clamp(DEFAULTS.playerLimit, rules.playerLimit),
  );
  const [timeLimit, setTimeLimit] = useState(() => clamp(DEFAULTS.timeLimit, rules.timeLimit));
  const [promptTimeLimit, setPromptTimeLimit] = useState(() =>
    clamp(DEFAULTS.promptTimeLimit, rules.promptTimeLimit),
  );
  // Filled in with the name this player used last time
  const [yourName, setYourName] = useState(() => useSettingsStore.getState().lastName);
  const [loading, setLoading] = useState<boolean>(false);

  const canCreate = lobbyName.trim().length > 0 && yourName.trim().length > 0;

  const handleCreateLobby = async () => {
    try {
      setLoading(true);
      await createGame({
        hostName: yourName,
        lobbyName,
        rounds,
        playerLimit,
        timeLimit,
        promptTimeLimit,
      });

      router.push(`/lobby`);
    } catch (error) {
      reportActionError("Couldn't create the game", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SoapboxPage title="Create Game" onBack={() => router.back()}>
      <Board label="The room">
        <FieldRow label="Lobby Name">
          <InlineTextInput
            value={lobbyName}
            onChangeText={setLobbyName}
            maxLength={rules.lobbyNameMaxLength}
            accessibilityLabel="Lobby name"
          />
        </FieldRow>
        <FieldRow label="Your Name" last>
          <InlineTextInput
            value={yourName}
            onChangeText={setYourName}
            maxLength={rules.playerNameMaxLength}
            accessibilityLabel="Your name"
          />
        </FieldRow>
      </Board>

      <Board label="House rules" delay={120} style={{ marginTop: 34 }}>
        {/* Only shown once the server allows more than one round (it's fixed at 1 for now) */}
        {rules.rounds.max > rules.rounds.min ? (
          <RangeStepper label="Rounds" value={rounds} setValue={setRounds} range={rules.rounds} />
        ) : null}
        <RangeStepper
          label="Player Limit"
          value={playerLimit}
          setValue={setPlayerLimit}
          range={rules.playerLimit}
        />
        <RangeStepper
          label="Writing Time"
          value={promptTimeLimit}
          setValue={setPromptTimeLimit}
          range={rules.promptTimeLimit}
          step={STEP_SECONDS}
          unit="s"
        />
        <RangeStepper
          label="Defense Time"
          value={timeLimit}
          setValue={setTimeLimit}
          range={rules.timeLimit}
          step={STEP_SECONDS}
          unit="s"
          last
        />
      </Board>

      <View style={{ marginTop: 28 }}>
        <SoapboxButton onPress={handleCreateLobby} disabled={!canCreate || loading}>
          {loading ? <ActivityIndicator color={SOAPBOX.paper} /> : "Create Lobby"}
        </SoapboxButton>
      </View>
    </SoapboxPage>
  );
};

const CreateScreen = () => {
  const router = useRouter();
  const rules = useRules();

  // The form's limits come from the server; they're usually cached by the time you get here
  if (!rules) {
    return (
      <SoapboxPage title="Create Game" onBack={() => router.back()}>
        <ActivityIndicator size="large" color={SOAPBOX.marker} />
      </SoapboxPage>
    );
  }
  return <CreateForm rules={rules} />;
};

export default CreateScreen;
