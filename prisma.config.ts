// ============================================================
// Prisma configuration file (Prisma 7+)
// ============================================================
// DATABASE_URL controls which database Prisma connects to.
//
// Local development (.env):
//   DATABASE_URL="file:./prisma/dev.db"    ← SQLite (existing local DB)
//
// Production (Render / Railway / etc.):
//   DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
//   DIRECT_URL="postgresql://user:pass@host:5432/db?sslmode=require"
//
// DIRECT_URL is the same value as DATABASE_URL on Render (no pgBouncer).
// On Supabase / pgBouncer set DIRECT_URL to the direct (non-pooler) URL.
// ============================================================

import { defineConfig } from "prisma/config";

// Read URLs from environment.  dotenv is loaded by Prisma CLI automatically.
const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const directUrl   = process.env.DIRECT_URL   ?? databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
