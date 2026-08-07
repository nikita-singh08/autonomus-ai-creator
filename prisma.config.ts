// ============================================================
// Prisma configuration file (Prisma 7+)
// Replaces the `url` property in the schema.prisma datasource block.
// See: https://pris.ly/d/config-datasource
// ============================================================

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "file:./prisma/dev.db",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
