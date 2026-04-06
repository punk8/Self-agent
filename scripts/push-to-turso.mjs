/**
 * Push Prisma schema to Turso cloud database.
 *
 * Usage:
 *   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/push-to-turso.mjs
 */
import { createClient } from "@libsql/client";
import { execSync } from "child_process";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Error: DATABASE_URL and DATABASE_AUTH_TOKEN must be set");
  console.error('Usage: DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." node scripts/push-to-turso.mjs');
  process.exit(1);
}

console.log(`Connecting to ${url} ...`);

const client = createClient({ url, authToken });

// Generate SQL from Prisma schema using migrate diff
console.log("Generating SQL from Prisma schema...");
const sql = execSync(
  'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script',
  { encoding: "utf-8" }
);

// Remove comment lines, then split into individual statements
const cleanSql = sql
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

const statements = cleanSql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0)
  .map((s) => s + ";");

console.log(`Found ${statements.length} SQL statements to execute.\n`);

let success = 0;
let skipped = 0;

for (const stmt of statements) {
  // Use IF NOT EXISTS to make it idempotent
  const safeStmt = stmt
    .replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
    .replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
    .replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ");

  const preview = safeStmt.substring(0, 80).replace(/\n/g, " ");
  try {
    await client.execute(safeStmt);
    console.log(`  ✓ ${preview}...`);
    success++;
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log(`  ⊘ ${preview}... (already exists)`);
      skipped++;
    } else {
      console.error(`  ✗ ${preview}...`);
      console.error(`    Error: ${e.message}`);
    }
  }
}

console.log(`\nDone! ${success} created, ${skipped} already existed.`);

// Verify tables
const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log("\nTables in database:");
for (const row of result.rows) {
  console.log(`  - ${row.name}`);
}

client.close();
