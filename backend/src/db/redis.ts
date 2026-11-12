import Redis from "ioredis";
import { RedisPubSub } from "graphql-redis-subscriptions";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL);

export const pubsub = new RedisPubSub({
  publisher: new Redis(REDIS_URL),
  subscriber: new Redis(REDIS_URL),
});
