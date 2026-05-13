/**
 * One-time backfill: encrypt existing plaintext OAuth tokens into *_enc columns.
 *
 * Run once after deploying migration 012_token_encryption.sql:
 *
 *   TOKEN_ENCRYPTION_KEY=<your-key> \
 *   NEXT_PUBLIC_SUPABASE_URL=<url> \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   npx tsx scripts/encrypt-tokens.ts
 *
 * The script prints a summary, then prompts before committing.
 * After confirming success, run:
 *   ALTER TABLE oauth_connections DROP COLUMN access_token;
 *   ALTER TABLE oauth_connections DROP COLUMN refresh_token;
 */

import { createClient } from "@supabase/supabase-js";
import { encryptToken } from "../src/lib/oauth/tokens";
import * as readline from "readline";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("ERROR: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!process.env.TOKEN_ENCRYPTION_KEY) {
  console.error("ERROR: TOKEN_ENCRYPTION_KEY is not set");
  process.exit(1);
}

const admin = createClient(url, key);

async function confirm(msg: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${msg} [y/N] `, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase() === "y");
    });
  });
}

async function run() {
  const { data: rows, error } = await admin
    .from("oauth_connections")
    .select("id, access_token, refresh_token, access_token_enc, refresh_token_enc");

  if (error) { console.error(error.message); process.exit(1); }

  const toBackfill = (rows ?? []).filter(
    (r) => (!r.access_token_enc || !r.refresh_token_enc) && (r.access_token || r.refresh_token),
  );

  console.log(`Total connections: ${(rows ?? []).length}`);
  console.log(`Need backfill: ${toBackfill.length}`);

  if (toBackfill.length === 0) {
    console.log("Nothing to backfill — all rows already encrypted.");
    return;
  }

  const go = await confirm(`Encrypt ${toBackfill.length} row(s)?`);
  if (!go) { console.log("Aborted."); return; }

  let ok = 0;
  let fail = 0;
  for (const row of toBackfill) {
    const { error: upErr } = await admin
      .from("oauth_connections")
      .update({
        access_token_enc: row.access_token ? encryptToken(row.access_token) : null,
        refresh_token_enc: row.refresh_token ? encryptToken(row.refresh_token) : null,
      })
      .eq("id", row.id);
    if (upErr) { console.error(`Row ${row.id}: ${upErr.message}`); fail++; }
    else ok++;
  }

  console.log(`Done: ${ok} encrypted, ${fail} failed.`);
  if (fail === 0) {
    console.log("\nAll rows encrypted. You may now drop the plaintext columns:");
    console.log("  ALTER TABLE oauth_connections DROP COLUMN access_token;");
    console.log("  ALTER TABLE oauth_connections DROP COLUMN refresh_token;");
  }
}

run().catch(console.error);
