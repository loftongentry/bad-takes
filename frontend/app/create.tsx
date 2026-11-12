import { useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "expo-router";
import { Spinner } from "tamagui";
import { Page } from "../src/ui/Page";
import { StepperRow } from "../src/ui/StepperRow";
import { TextFieldRow } from "../src/ui/TextFieldRow";
import { FormCard } from "../src/ui/FormCard";
import { PrimaryButton } from "../src/ui/PrimaryButton";
import { ActionRow } from "../src/ui/ActionRow";
import { useRoomActions } from "../src/hooks/useRoomActions";
import { useRules } from "../src/hooks/useRules";
import type { GameRules, Range } from "../src/graphql/types";

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
}: {
  label: string;
  value: number;
  setValue: Dispatch<SetStateAction<number>>;
  range: Range;
  step?: number;
  unit?: string;
}) => (
  <StepperRow
    label={label}
    valueText={`${value}${unit}`}
    decrementDisabled={value <= range.min}
    incrementDisabled={value >= range.max}
    onDecrement={() => setValue((current) => clamp(current - step, range))}
    onIncrement={() => setValue((current) => clamp(current + step, range))}
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
  const [yourName, setYourName] = useState<string>("");
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
      console.error("Error creating lobby:", error);
      alert("Failed to create lobby. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Create Game" onBack={() => router.back()}>
      <FormCard>
        <TextFieldRow
          label="Lobby Name"
          value={lobbyName}
          onChangeText={setLobbyName}
          placeholder="Lobby Name"
          maxLength={rules.lobbyNameMaxLength}
        />

        <RangeStepper label="Rounds" value={rounds} setValue={setRounds} range={rules.rounds} />

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
        />

        <TextFieldRow
          label="Your Name"
          value={yourName}
          onChangeText={setYourName}
          placeholder="Enter name"
          maxLength={rules.playerNameMaxLength}
          showDivider={false}
        />
      </FormCard>

      <ActionRow>
        <PrimaryButton onPress={handleCreateLobby} disabled={!canCreate || loading}>
          {loading ? <Spinner /> : "Create Lobby"}
        </PrimaryButton>
      </ActionRow>
    </Page>
  );
};

const CreateScreen = () => {
  const router = useRouter();
  const rules = useRules();

  // The form's limits come from the server; they're usually cached by the time you get here
  if (!rules) {
    return (
      <Page title="Create Game" onBack={() => router.back()}>
        <Spinner />
      </Page>
    );
  }
  return <CreateForm rules={rules} />;
};

export default CreateScreen;
