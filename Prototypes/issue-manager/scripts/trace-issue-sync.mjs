#!/usr/bin/env node
/**
 * Fetch Blob vs SQLite diagnostics from a deployed issue-manager instance.
 *
 * Usage:
 *   ISSUE_MANAGER_URL=https://your-app.vercel.app \
 *   ISSUE_MANAGER_ADMIN_SECRET=... \
 *   node scripts/trace-issue-sync.mjs
 *
 * Optional: ISSUE_MANAGER_TRACE_LOG=1 on Vercel, then check Runtime Logs for lines prefixed [issue-manager:sync]
 */

const base = (process.env.ISSUE_MANAGER_URL || "").replace(/\/$/, "");
const secret = process.env.ISSUE_MANAGER_ADMIN_SECRET || "";

if (!base || !secret) {
  console.error(
    "Set ISSUE_MANAGER_URL (no trailing slash) and ISSUE_MANAGER_ADMIN_SECRET.",
  );
  process.exit(1);
}

const url = `${base}/api/admin/diagnostics`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-admin-secret": secret,
  },
  body: JSON.stringify({ secret }),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Non-JSON response", res.status, text.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error("HTTP", res.status, json);
  process.exit(1);
}

console.log(JSON.stringify(json, null, 2));

const interp = json.interpret;
if (Array.isArray(interp) && interp.length) {
  console.error("\n--- interpret ---");
  for (const line of interp) console.error(line);
}
