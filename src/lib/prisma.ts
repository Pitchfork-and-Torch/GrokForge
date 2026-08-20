import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Neon serverless driver + Prisma adapter.
 *
 * Stock Prisma Client opens a TCP pool through PgBouncer and leaves idle
 * sessions up. Those sessions keep Neon compute awake (Free CU-hours).
 *
 * HTTP covers ordinary queries (no sticky socket). Interactive transactions
 * still use a short-lived WebSocket via Pool.connect(). Idle sockets must
 * close — pg treats idleTimeoutMillis = 0 as "never disconnect".
 */
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

const prismaLog =
  process.env.NODE_ENV === "development"
    ? (["error", "warn"] as const)
    : (["error"] as const);

/** Pool sizing for scale-to-zero. Do not set idleTimeoutMillis to 0. */
export const neonPoolOptions = {
  max: 3,
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 20_000,
  allowExitOnIdle: true,
} as const;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Sitemap / CI builds may import this module with no URL. Do not throw here.
    return new PrismaClient({ log: [...prismaLog] });
  }

  const pool = new Pool({
    connectionString,
    ...neonPoolOptions,
  });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter, log: [...prismaLog] });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Dev HMR only. Production keeps the module singleton; the pool drops idle sockets.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
