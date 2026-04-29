import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");
const TRACKING_TABLE = "simpinv_migrations";

async function loadEnvLocal(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  try {
    const content = await readFile(join(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

async function main(): Promise<void> {
  await loadEnvLocal();
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URI;
  if (!url) {
    console.error("DATABASE_URL (or DATABASE_URI) is not set. Add it to .env.local or your shell env.");
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, ssl: "require", onnotice: () => {} });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
        filename    text PRIMARY KEY,
        applied_at  timestamptz NOT NULL DEFAULT now()
      );
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migrations found.");
      return;
    }

    const appliedRows = await sql<{ filename: string }[]>`
      SELECT filename FROM ${sql(TRACKING_TABLE)}
    `;
    const applied = new Set(appliedRows.map((r) => r.filename));

    let applyCount = 0;
    let skipCount = 0;

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip   ${file} (already applied)`);
        skipCount++;
        continue;
      }
      const body = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`  apply  ${file}`);
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO ${tx(TRACKING_TABLE)} (filename) VALUES (${file})`;
      });
      applyCount++;
    }

    console.log(`\nDone. applied=${applyCount} skipped=${skipCount} total=${files.length}`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
