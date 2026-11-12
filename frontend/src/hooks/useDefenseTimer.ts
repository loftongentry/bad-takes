// TODO: Remove host authority logic when time hits zero, and instead implement an "absolute time countdown" that all clients follow.
import { useEffect, useState } from "react";

export type DefensePhase = 'PREP' | 'DEFEND'

// Counts down a short prep phase, then the defense itself, then calls onDefenseEnd
export function useDefenseTimer(prepTime: number, defendTime: number, onDefenseEnd: () => void) {
  const [timeLeft, setTimeLeft] = useState<number>(prepTime)
  const [phase, setPhase] = useState<DefensePhase>('PREP')

  useEffect(() => {
    if (timeLeft <= 0) {
      if (phase === 'PREP') {
        setPhase('DEFEND')
        setTimeLeft(defendTime)
      } else if (phase === 'DEFEND') {
        onDefenseEnd()
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, phase, onDefenseEnd])

  const maxTime = phase === 'PREP' ? prepTime : defendTime

  return { phase, timeLeft, maxTime }
}
