// ============================================================
// Prisma client singleton
// ============================================================
// Detects the database provider from DATABASE_URL at startup:
//
//   file:...   → SQLite via better-sqlite3 adapter (local dev)
//   postgres:// / postgresql:// → PostgreSQL via pg adapter (prod)
//
// This allows the same codebase to run against SQLite locally
// and PostgreSQL in production without code changes. Prisma 7
// requires a driver adapter for all connections.
// ============================================================

import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isSQLite = DATABASE_URL.startsWith("file:");

function makePrismaClient(): PrismaClient {
  if (isSQLite) {
    // Local development: use better-sqlite3 driver adapter.
    // Dynamic import keeps the native module out of the production bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
    const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  // Production: use pg driver adapter.
  // Dynamic import so pg isn't bundled unless needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require("pg");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require("@prisma/adapter-pg");

  // Note: the pool picks up DATABASE_URL by default if connectionString isn't passed,
  // but it's safer to pass it explicitly.
  const pool = new Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? makePrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
