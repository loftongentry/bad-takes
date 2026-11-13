import Redis from "ioredis";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { logger } from "../logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ioredis reconnects by itself; log connection trouble instead of printing it unformatted
const connect = (role: string) =>
  new Redis(REDIS_URL).on("error", (err) => logger.error({ redis: role, err }, "Redis error"));

export const redis = connect("main");

export const pubsub = new RedisPubSub({
  publisher: connect("publisher"),
  subscriber: connect("subscriber"),
});
