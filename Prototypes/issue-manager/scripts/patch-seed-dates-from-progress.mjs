#!/usr/bin/env node
/**
 * One-off / repeatable: align issue.date with DD/MM/YY in progress when the stored
 * date matches the US (M/D) misread of the first "Update d/m/yy" line.
 * Run from repo: node scripts/patch-seed-dates-from-progress.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../src/data/issues.json");

function pad2(n) {
  return String(n).padStart(2, "0");
}
function expandYear(y) {
  return y >= 100 ? y : y + 2000;
}
function align(date, progress) {
  const m = /^[\s\S]*?Update\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i.exec(progress || "");
  if (!m) return date;
  const a = +m[1];
  const b = +m[2];
  const y = expandYear(+m[3]);
  const dmyIso = `${y}-${pad2(b)}-${pad2(a)}`;
  const mdyIso = `${y}-${pad2(a)}-${pad2(b)}`;
  if (date === mdyIso && dmyIso !== mdyIso) return dmyIso;
  return date;
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let n = 0;
for (const i of data) {
  const nd = align(i.date, i.progress);
  if (nd !== i.date) {
    i.date = nd;
    n++;
  }
}
fs.writeFileSync(jsonPath, JSON.stringify(data));
console.log(`Patched ${n} of ${data.length} rows → ${jsonPath}`);
