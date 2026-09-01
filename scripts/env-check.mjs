// Prints exactly which database Prisma will connect to, after the same env
// resolution the migrate scripts use. Passwords are never printed.
//
// Exists because a stale exported shell var (DATABASE_URL in .zshrc, an
// .envrc, or an earlier `export`) silently shadows the root .env unless
// dotenv-cli is given -o. The symptom is confusing: you edit .env, nothing
// changes, and Postgres keeps rejecting a database name you already fixed.
function describe(name, url) {
  if (!url) return `${name.padEnd(12)} -> UNSET`;
  try {
    const u = new URL(url);
    const db = u.pathname.slice(1);
    const warn = db && db !== "postgres" ? "   <-- Supabase db is ALWAYS 'postgres'" : "";
    return `${name.padEnd(12)} -> host=${u.hostname} port=${u.port} db=${db} user=${u.username}${warn}`;
  } catch {
    return `${name.padEnd(12)} -> UNPARSEABLE (check URL-encoding of the password: @ -> %40)`;
  }
}

console.log(describe("DATABASE_URL", process.env.DATABASE_URL));
console.log(describe("DIRECT_URL", process.env.DIRECT_URL));

const shellVars = ["DATABASE_URL", "DIRECT_URL"];
console.log("\nIf either line above is not what your .env says, a shell export is shadowing it.");
console.log("Check with:  env | grep -E '" + shellVars.join("|") + "'");
console.log("Clear with:  unset " + shellVars.join(" "));
