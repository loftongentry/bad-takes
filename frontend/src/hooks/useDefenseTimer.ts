import { useSecondsLeft } from "./useSecondsLeft";

export type DefensePhase = 'PREP' | 'DEFEND'

// Counts down to the server's deadline for this defense. The deadline covers a short prep
// phase followed by the defense itself; the server ends the turn when it passes, so every
// player's countdown matches and no device has to tell the server time is up.
// (Display only: it uses this device's clock, so a phone whose clock is off by a few seconds
// shows a slightly different countdown, but the turn still ends at the same moment for all.)
export function useDefenseTimer(deadline: string | null | undefined, prepTime: number, defendTime: number) {
  const secondsLeft = useSecondsLeft(deadline) ?? prepTime + defendTime

  const phase: DefensePhase = secondsLeft > defendTime ? 'PREP' : 'DEFEND'
  const timeLeft = phase === 'PREP' ? secondsLeft - defendTime : secondsLeft
  const maxTime = phase === 'PREP' ? prepTime : defendTime

  return { phase, timeLeft, maxTime }
}
