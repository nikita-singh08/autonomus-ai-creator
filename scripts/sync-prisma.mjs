import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
let schema = fs.readFileSync(schemaPath, "utf8");

// Default to SQLite if no URL is provided, to preserve local dev functionality
const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const isSQLite = dbUrl.startsWith("file:");

if (isSQLite) {
  // Switch to SQLite provider
  schema = schema.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  console.log("sync-prisma: Set provider to 'sqlite' based on DATABASE_URL");
} else {
  // Switch to PostgreSQL provider
  schema = schema.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  console.log("sync-prisma: Set provider to 'postgresql' based on DATABASE_URL");
}

fs.writeFileSync(schemaPath, schema);
