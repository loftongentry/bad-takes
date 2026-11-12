// Pure game-state helpers (no Redis access)
import type { Player, Prompt, StoredGameState, Turn } from "../types";

export function emptyGameState(): StoredGameState {
  return {
    prompts: [],
    queue: [],
    votes: {},
    currentTurn: null,
    deadline: null
  };
}

// Fisher-Yates shuffle: every ordering is equally likely
// (unlike sort(() => 0.5 - Math.random()), which is biased)
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const promptFor = (prompts: Prompt[], index: number) => prompts[index % prompts.length];

const anyoneHasOwnPrompt = (defenders: Player[], prompts: Prompt[]) =>
  defenders.some((player, i) => promptFor(prompts, i).authorId === player.id);

// Builds the turn queue: every player defends once, in random order, and nobody is handed
// their own prompt. Prompts are reshuffled until that holds; with 2+ players roughly 1 in 3
// shuffles works, so this takes a few tries at most. (With 1 player it can't hold, so after
// the attempts run out the last shuffle is used.)
export function generateQueue(players: Player[], prompts: Prompt[]): Turn[] {
  const defenders = shuffle(players);

  let assigned = shuffle(prompts);
  for (let attempt = 0; attempt < 100 && anyoneHasOwnPrompt(defenders, assigned); attempt++) {
    assigned = shuffle(prompts);
  }

  return defenders.map((player, i) => ({
    defenderId: player.id,
    promptId: promptFor(assigned, i).id,
    promptText: promptFor(assigned, i).text
  }));
}
