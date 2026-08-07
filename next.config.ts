import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js module (.node binary).
  // It must never be bundled by Next.js — it must be loaded at runtime
  // by Node directly.  Without this, the adapter throws
  // "Module not found: Can't resolve 'better-sqlite3'" on every request.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
};

export default nextConfig;
