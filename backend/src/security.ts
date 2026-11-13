// Settings that protect the public server (see "Environment" in the README)
import type { IncomingMessage } from "http";
import { GameError } from "./game/errors";
import { withinRateLimit } from "./db/rateLimit";

const limitFromEnv = (name: string, fallback: number) => {
  const raw = process.env[name]?.trim();
  return raw && Number.isFinite(Number(raw)) ? Number(raw) : fallback;
};

export const PRODUCTION = process.env.NODE_ENV === "production";

// Web pages allowed to use the API from a browser, e.g. "https://badtakes.example". Unset means
// any page may (fine for development). The phone apps aren't web pages, so this doesn't affect
// them.
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

// Behind a proxy or load balancer, how many hops to trust when reading the caller's address from
// X-Forwarded-For (e.g. "1"). Without it, every player would seem to share the proxy's address.
// Passed to Express's "trust proxy" setting.
export const TRUST_PROXY: boolean | number | string = (() => {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw || raw === "false") return false;
  if (raw === "true") return true;
  return Number.isInteger(Number(raw)) ? Number(raw) : raw;
})();

// Browsers don't apply CORS to WebSockets, so live updates check the page's origin themselves.
// Connections with no Origin (most non-browser clients) or from the server's own address
// (React Native sends that) are let through.
export function isAllowedWebSocketOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.length === 0 || !origin) {
    return true;
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// Attempts per minute from one address (0 turns a limit off). Generous enough for a party
// joining from one Wi-Fi network, tight enough to stop scripts guessing join codes.
const CREATE_PER_MINUTE = limitFromEnv("RATE_LIMIT_CREATE_PER_MINUTE", 10);
const JOIN_PER_MINUTE = limitFromEnv("RATE_LIMIT_JOIN_PER_MINUTE", 30);

export async function checkCreateRate(ip: string) {
  if (!(await withinRateLimit("create", ip, CREATE_PER_MINUTE))) {
    throw new GameError("Too many games started from here. Wait a minute and try again.");
  }
}

export async function checkJoinRate(ip: string) {
  if (!(await withinRateLimit("join", ip, JOIN_PER_MINUTE))) {
    throw new GameError("Too many attempts to join. Wait a minute and try again.");
  }
}
