import { useEffect, useState } from "react";

// Whole seconds until a server deadline (ISO time), updating a few times a second.
// Null when there's no deadline. Uses this device's clock, so it's for display only:
// the server decides when a phase actually ends.
export function useSecondsLeft(deadline: string | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(timer)
  }, [])

  if (!deadline) {
    return null
  }
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000))
}
