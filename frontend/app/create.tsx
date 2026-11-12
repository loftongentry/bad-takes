import { useState } from "react";
import { useRouter } from "expo-router";
import { Spinner } from "tamagui";
import { Page } from "../src/ui/Page";
import { StepperRow } from "../src/ui/StepperRow";
import { TextFieldRow } from "../src/ui/TextFieldRow";
import { FormCard } from "../src/ui/FormCard";
import { PrimaryButton } from "../src/ui/PrimaryButton";
import { ActionRow } from "../src/ui/ActionRow";
import { useRoomActions } from "../src/hooks/useRoomActions";

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Constraints
// TODO: Implement logic that handles multiple rounds instead of just 1
const MIN_ROUNDS = 1;
const MAX_ROUNDS = 1;

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 20;

const STEP_SECONDS = 15;
// Defense time
const MIN_SECONDS = 60;
const MAX_SECONDS = 5 * 60; // 5 Minutes
// Writing time (to write a take)
const MIN_WRITING_SECONDS = 30;
const MAX_WRITING_SECONDS = 3 * 60;

const CreateScreen = () => {
  const router = useRouter();
  const { createGame } = useRoomActions();
  const [lobbyName, setLobbyName] = useState<string>("");
  const [rounds, setRounds] = useState<number>(1);
  const [playerLimit, setPlayerLimit] = useState<number>(5);
  const [timeLimit, setTimeLimit] = useState<number>(60);
  const [promptTimeLimit, setPromptTimeLimit] = useState<number>(90);
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
          maxLength={40}
        />

        <StepperRow
          label="Rounds"
          valueText={String(rounds)}
          decrementDisabled={rounds <= MIN_ROUNDS}
          incrementDisabled={rounds >= MAX_ROUNDS}
          onDecrement={() => setRounds((r) => clamp(r - 1, MIN_ROUNDS, MAX_ROUNDS))}
          onIncrement={() => setRounds((r) => clamp(r + 1, MIN_ROUNDS, MAX_ROUNDS))}
        />

        <StepperRow
          label="Player Limit"
          valueText={String(playerLimit)}
          decrementDisabled={playerLimit <= MIN_PLAYERS}
          incrementDisabled={playerLimit >= MAX_PLAYERS}
          onDecrement={() => setPlayerLimit((p) => clamp(p - 1, MIN_PLAYERS, MAX_PLAYERS))}
          onIncrement={() => setPlayerLimit((p) => clamp(p + 1, MIN_PLAYERS, MAX_PLAYERS))}
        />

        <StepperRow
          label="Writing Time"
          valueText={`${promptTimeLimit}s`}
          decrementDisabled={promptTimeLimit <= MIN_WRITING_SECONDS}
          incrementDisabled={promptTimeLimit >= MAX_WRITING_SECONDS}
          onDecrement={() =>
            setPromptTimeLimit((s) =>
              clamp(s - STEP_SECONDS, MIN_WRITING_SECONDS, MAX_WRITING_SECONDS),
            )
          }
          onIncrement={() =>
            setPromptTimeLimit((s) =>
              clamp(s + STEP_SECONDS, MIN_WRITING_SECONDS, MAX_WRITING_SECONDS),
            )
          }
        />

        <StepperRow
          label="Defense Time"
          valueText={`${timeLimit}s`}
          decrementDisabled={timeLimit <= MIN_SECONDS}
          incrementDisabled={timeLimit >= MAX_SECONDS}
          onDecrement={() => setTimeLimit((s) => clamp(s - STEP_SECONDS, MIN_SECONDS, MAX_SECONDS))}
          onIncrement={() => setTimeLimit((s) => clamp(s + STEP_SECONDS, MIN_SECONDS, MAX_SECONDS))}
        />

        <TextFieldRow
          label="Your Name"
          value={yourName}
          onChangeText={setYourName}
          placeholder="Enter name"
          maxLength={24}
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

export default CreateScreen;
