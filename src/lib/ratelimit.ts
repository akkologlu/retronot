import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedis =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

// No-op ratelimit used when Redis is not configured (e.g. local dev)
const noopRatelimit = {
  limit: async () => ({ success: true }),
} as unknown as Ratelimit;

export const inviteRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "invite",
    })
  : noopRatelimit;

export const cardRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix: "card",
    })
  : noopRatelimit;

export const voteRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "vote",
    })
  : noopRatelimit;

export const aiRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "ai",
    })
  : noopRatelimit;

export const loginRatelimit = hasRedis
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "5 m"),
      prefix: "login",
    })
  : noopRatelimit;
