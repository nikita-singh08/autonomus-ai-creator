import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma driver adapters and their underlying native modules must not be
  // bundled by Next.js. We list both the SQLite and PostgreSQL modules here
  // so the same build output can run in either environment depending on the
  // DATABASE_URL provided at runtime.
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "pg",
    "@prisma/adapter-pg",
  ],
};

export default nextConfig;
