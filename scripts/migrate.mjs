// Minimal migration runner — applies db/migrations/*.sql in order, tracked
// in a schema_migrations table. Not Terraform's job (README §7) — schema
// and RLS live here, applied via SQL tooling.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  await pool.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
  );
  const { rows: applied } = await pool.query("select name from schema_migrations");
  const appliedNames = new Set(applied.map((r) => r.name));

  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (appliedNames.has(file)) continue;
    console.log(`applying ${file}`);
    const sql = readFileSync(path.join(dir, file), "utf8");
    await pool.query(sql);
    await pool.query("insert into schema_migrations (name) values ($1)", [file]);
  }
  console.log("done");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
