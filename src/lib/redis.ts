import { Redis } from "@upstash/redis";
import { redisMock } from "./redis-mock";

function isUpstashConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? "";
  return url.startsWith("https://") && !url.includes("your-redis");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RedisLike = any;

declare global {
  var redis: RedisLike | undefined;
}

function createRedisClient(): RedisLike {
  if (isUpstashConfigured()) {
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  console.warn("[redis] Upstash not configured — using in-memory mock (dev only)");
  return redisMock;
}

export const redis: RedisLike = global.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}

// Cache TTLs (seconds)
export const TTL = {
  SERVICOS: 600,       // 10 min
  COLABORADORES: 300,  // 5 min
  SLOTS: 120,          // 2 min
  RELATORIOS: 1800,    // 30 min
  CLIENTE: 300,        // 5 min
} as const;

export async function invalidateCache(...keys: string[]) {
  if (keys.length === 0) return;
  await redis.del(...keys);
}

export function cacheKey(template: string, ...args: string[]): string {
  return args.reduce((acc, arg, i) => acc.replace(`{${i}}`, arg), template);
}

// Cache key templates
export const CK = {
  SERVICOS: (salonId: string) => `salon:${salonId}:servicos`,
  COLABORADORES: (salonId: string) => `salon:${salonId}:colaboradores`,
  SLOTS: (colaboradorId: string, date: string) =>
    `slots:${colaboradorId}:${date}`,
  RELATORIO: (salonId: string, type: string, period: string) =>
    `report:${salonId}:${type}:${period}`,
  CLIENTE: (userId: string) => `cliente:${userId}`,
  SSE_CHANNEL: (salonId: string) => `salon:${salonId}:events`,
};
