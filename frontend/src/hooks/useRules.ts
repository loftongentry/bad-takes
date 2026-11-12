import { useQuery } from "@apollo/client/react";
import { ROOM_OPS } from "../graphql/operations";
import type { GameRules } from "../graphql/types";

// The game's rules and limits, from the server. Fetched once and cached: the home screen asks
// first (How to Play), so later screens get them instantly. Undefined until the first load.
export function useRules(): GameRules | undefined {
  const { data } = useQuery<{ rules: GameRules }>(ROOM_OPS.RULES, { fetchPolicy: "cache-first" });
  return data?.rules;
}
