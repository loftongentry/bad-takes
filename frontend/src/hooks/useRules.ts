import { useQuery } from "@apollo/client/react";
import { ROOM_OPS } from "../graphql/operations";
import type { GameRules } from "../graphql/types";

// The game's rules and limits, from the server, plus whether loading them failed. Fetched once
// and cached: the home screen asks first (How to Play), so later screens get them instantly.
export function useRulesQuery() {
  const { data, error, refetch } = useQuery<{ rules: GameRules }>(ROOM_OPS.RULES, {
    fetchPolicy: "cache-first",
  });
  return { rules: data?.rules, error, refetch };
}

// Just the rules: undefined until the first load
export function useRules(): GameRules | undefined {
  return useRulesQuery().rules;
}
