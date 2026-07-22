import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const dbUrl = (process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "").trim();

if (!url || !key) {
  console.error("Missing Supabase env in .env.local");
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/009_order_payment_stripe.sql"),
  "utf8",
);

const supabase = createClient(url, key);

const { error: checkError } = await supabase
  .from("orders")
  .select("stripe_session_id")
  .limit(1);
if (!checkError) {
  console.log("stripe_session_id column already exists.");
  process.exit(0);
}

if (!dbUrl) {
  console.log(
    "stripe_session_id column missing. Add DATABASE_URL to .env.local or run this SQL in Supabase SQL Editor:",
  );
  console.log("");
  console.log(sql);
  process.exit(2);
}

const { Client } = await import("pg");
const client = new Client({ connectionString: dbUrl });
await client.connect();
await client.query(sql);
await client.end();

const { error: verifyError } = await supabase
  .from("orders")
  .select("stripe_session_id")
  .limit(1);
if (verifyError) {
  console.error("Migration ran but verify failed:", verifyError.message);
  process.exit(1);
}

console.log("009_order_payment_stripe migration applied successfully.");
