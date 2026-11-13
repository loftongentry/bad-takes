import { redis } from "./redis";

// Counts attempts per caller in fixed one-minute windows, in Redis so the limit holds across
// several server instances. Returns false once `limit` attempts have been made this minute.
// A limit of 0 turns the check off (the tests do, since they create rooms by the hundred).
export async function withinRateLimit(action: string, caller: string, limit: number) {
  if (limit <= 0) {
    return true;
  }
  const minute = Math.floor(Date.now() / 60_000);
  const key = `ratelimit:${action}:${caller}:${minute}`;
  const [[, count]] = (await redis.multi().incr(key).expire(key, 120).exec()) as [
    [Error | null, number],
    [Error | null, number],
  ];
  return count <= limit;
}
