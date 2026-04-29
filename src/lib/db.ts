import postgres from "postgres";

declare global {
  var __simpinv_sql: ReturnType<typeof postgres> | undefined;
}

function createClient(): ReturnType<typeof postgres> {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URI;
  if (!url) {
    throw new Error("DATABASE_URL (or DATABASE_URI) is not set");
  }
  return postgres(url, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: "require",
    onnotice: () => {},
  });
}

export const sql = globalThis.__simpinv_sql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__simpinv_sql = sql;
}
