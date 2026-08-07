// ============================================================
// Prisma client singleton — prevents multiple connections in
// development (Next.js hot-reload creates new module instances)
// ============================================================
// Uses @prisma/adapter-better-sqlite3 for Prisma 7 driver-adapter mode.
// better-sqlite3 is a native module — excluded from Next.js bundling via
// serverExternalPackages in next.config.ts.

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// DATABASE_URL is read from .env / .env.local by Next.js at startup.
// The fallback matches prisma.config.ts so migrate and runtime use the same file.
const DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

function makePrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: DATABASE_URL });
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
