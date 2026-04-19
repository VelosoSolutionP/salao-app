import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!;

  if (connectionString?.includes("neon.tech")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { neonConfig } = require("@neondatabase/serverless");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon");
    if (typeof globalThis.WebSocket === "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      neonConfig.webSocketConstructor = require("ws");
    }
    // Aumenta timeout para cold start do Neon free tier (~3s para acordar)
    neonConfig.fetchConnectionCache = true;
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter } as any);
  }

  // Local / standard PostgreSQL via pg driver
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 8000 });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export const prisma: PrismaClient = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
