import { readFile } from "node:fs/promises";
import postgres from "postgres";

async function main(): Promise<void> {
  const env = await readFile(".env.local", "utf8").catch(() => "");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?([^"\r\n]+)"?/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URI;
  if (!url) {
    console.error("No DATABASE_URL/URI");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1, ssl: "require", onnotice: () => {} });

  try {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'simpinv_items'
      ORDER BY ordinal_position
    `;
    console.log("--- columns ---");
    for (const c of cols) console.log(c);

    const idx = await sql`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'simpinv_items'
      ORDER BY indexname
    `;
    console.log("--- indexes ---");
    for (const i of idx) console.log(i);

    const checks = await sql`
      SELECT con.conname, pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'simpinv_items' AND con.contype = 'c'
      ORDER BY con.conname
    `;
    console.log("--- check constraints ---");
    for (const c of checks) console.log(c);

    const trig = await sql`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'simpinv_items'
    `;
    console.log("--- triggers ---");
    for (const t of trig) console.log(t);

    const mig = await sql`SELECT filename, applied_at FROM simpinv_migrations`;
    console.log("--- applied migrations ---");
    for (const m of mig) console.log(m);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
