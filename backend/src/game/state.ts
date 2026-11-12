// Pure game-state helpers (no Redis access)
import type { Player, Prompt, StoredGameState, Turn } from "../types";

export function emptyGameState(): StoredGameState {
  return {
    prompts: [],
    queue: [],
    votes: {},
    currentTurn: null
  };
}

// TODO: update to avoid self-defense
export function generateQueue(players: Player[], prompts: Prompt[]): Turn[] {
  // Shuffle prompts randomly
  const shuffledPrompts = [...prompts].sort(() => 0.5 - Math.random());

  // Assign each player a prompt to defend
  return players.map((p, i) => ({
    defenderId: p.id,
    promptId: shuffledPrompts[i % shuffledPrompts.length].id,
    promptText: shuffledPrompts[i % shuffledPrompts.length].text
  }));
}
