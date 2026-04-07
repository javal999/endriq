import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import type { Issue, IssueGroup } from "./types";
import seedIssuesData from "../data/issues.json";
import {
  isBlobReplicaEnabled,
  assertBlobReplicaForVercelWrites,
  replicaLoadAllIssues,
  replicaLoadIssue,
  replicaPutIssue,
  replicaLoadGroups,
  replicaPutAllGroups,
  replicaLoadIssuesMissingFromBlob,
  replicaMaxIssueSerialFromPaths,
  listIssueBlobMetasExcludingGroups,
  issueIdFromBlobPathname,
} from "./issue-blob-sync";
import { CANONICAL_ISSUE_DATES } from "./canonical-date-fixes";
import { issueSyncTrace } from "./issue-sync-trace";

type IssueRow = Issue & { dedupHash: string; source: string; createdAt: string };

/** Built-in seed rows: canonical dates after JSON fixes. SQLite on Vercel often never re-seeds (DB already has rows); blob can also be stale. */
const SEED_ISSUE_BY_ID = new Map<string, Issue>(
  (seedIssuesData as Issue[]).map((iss) => [iss.id, iss]),
);

/**
 * When true, bundled `issues.json` overrides `date` for matching IDs (fixes stale SQLite on Vercel).
 * When false (default on production unless CANONICAL_DATES_FROM_BUNDLE=1), SQLite/Blob/Excel upload dates win.
 */
function shouldOverlayBundledDates(): boolean {
  if (process.env.CANONICAL_DATES_FROM_BUNDLE === "0") return false;
  if (process.env.CANONICAL_DATES_FROM_BUNDLE === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function applyBundledSeedDate(issue: Issue): Issue {
  if (!shouldOverlayBundledDates()) return issue;
  const seed = SEED_ISSUE_BY_ID.get(issue.id);
  if (!seed || seed.date === issue.date) return issue;
  return { ...issue, date: seed.date };
}

/** Admin: wipe all issues and group state (SQLite, this instance). */
export function adminDeleteAllIssuesAndGroups(): {
  issuesRemoved: number;
  groupsRemoved: number;
} {
  const db = getDb();
  const ic = (db.prepare("SELECT COUNT(*) as c FROM issues").get() as { c: number }).c;
  const gc = (db.prepare("SELECT COUNT(*) as c FROM issue_groups").get() as { c: number }).c;
  db.exec("DELETE FROM issue_groups");
  db.exec("DELETE FROM issues");
  return { issuesRemoved: ic, groupsRemoved: gc };
}

export type AlignDatesResult = {
  updated: { id: string; from: string; to: string }[];
  skipped: { id: string; reason: string }[];
};

/**
 * One-off production fix: set `date` + recomputed `dedupHash` from CANONICAL_ISSUE_DATES,
 * hydrate from Blob into local SQLite if missing, then replicaPutIssue when Blob is on.
 */
export async function adminAlignCanonicalDates(): Promise<AlignDatesResult> {
  getDb();
  const updated: AlignDatesResult["updated"] = [];
  const skipped: AlignDatesResult["skipped"] = [];

  for (const [id, toDate] of Object.entries(CANONICAL_ISSUE_DATES)) {
    let row = getIssueLocal(id) as IssueRow | undefined;
    if (!row && isBlobReplicaEnabled()) {
      const remote = await replicaLoadIssue(id);
      if (remote) {
        row = rowToIssueRow(remote);
        upsertIssueLocal(row);
      }
    }
    if (!row) {
      skipped.push({ id, reason: "not_found" });
      continue;
    }

    const expectedHash = computeDedupHash(
      row.area,
      toDate,
      row.divisi,
      row.role,
      row.issue,
    );
    if (row.date === toDate && row.dedupHash === expectedHash) {
      skipped.push({ id, reason: "already_aligned" });
      continue;
    }

    const conflict = getDb()
      .prepare("SELECT id FROM issues WHERE dedupHash = ? AND id != ?")
      .get(expectedHash, id) as { id: string } | undefined;
    if (conflict) {
      skipped.push({ id, reason: `dedup_hash_conflict_with_${conflict.id}` });
      continue;
    }

    const fromDate = row.date;
    getDb()
      .prepare("UPDATE issues SET date = @date, dedupHash = @dedupHash WHERE id = @id")
      .run({ id, date: toDate, dedupHash: expectedHash });

    const fresh = getIssueLocal(id) as IssueRow | undefined;
    if (fresh && isBlobReplicaEnabled()) {
      await replicaPutIssue(fresh);
    }
    updated.push({ id, from: fromDate, to: toDate });
  }

  return { updated, skipped };
}

function getDataDir(): string {
  if (process.env.VERCEL) {
    return "/tmp/issue-manager-data";
  }
  return path.join(process.cwd(), "data");
}

const DB_PATH = path.join(getDataDir(), "issues.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      area TEXT NOT NULL,
      divpiRaw TEXT DEFAULT '',
      divisi TEXT NOT NULL,
      roleRaw TEXT DEFAULT '',
      role TEXT NOT NULL,
      klassifikasiLama TEXT DEFAULT '',
      issue TEXT NOT NULL,
      summary TEXT NOT NULL,
      l1Domain TEXT NOT NULL,
      l2ProcessArea TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      routeTo TEXT NOT NULL,
      followUp TEXT DEFAULT '',
      progress TEXT DEFAULT '',
      ticketHc TEXT DEFAULT '',
      urgencyLama TEXT DEFAULT '',
      dedupHash TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'excel',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
    CREATE INDEX IF NOT EXISTS idx_issues_dedup ON issues(dedupHash);
    CREATE INDEX IF NOT EXISTS idx_issues_l1 ON issues(l1Domain);
    CREATE INDEX IF NOT EXISTS idx_issues_area ON issues(area);
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS issue_groups (
      groupKey TEXT PRIMARY KEY,
      l1Domain TEXT NOT NULL,
      l2ProcessArea TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      acknowledgedAt TEXT,
      acknowledgedBy TEXT,
      reopenedAt TEXT,
      issueCountAtAck INTEGER DEFAULT 0
    )
  `);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS classification_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issueId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      prevL1 TEXT,
      newL1 TEXT,
      prevL2 TEXT,
      newL2 TEXT,
      issueSnippet TEXT
    )
  `);

  const count = (_db.prepare("SELECT COUNT(*) as c FROM issues").get() as { c: number }).c;
  if (count === 0 && process.env.DISABLE_ISSUE_JSON_SEED !== "1") {
    seedFromJson();
  }

  return _db;
}

export function computeDedupHash(area: string, date: string, divisi: string, role: string, issueText: string): string {
  const raw = [area, date, divisi, role, issueText].map((s) => s.trim().toLowerCase()).join("|");
  return crypto.createHash("md5").update(raw).digest("hex");
}

function seedFromJson() {
  const data = seedIssuesData as Issue[];
  const db = _db!;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO issues
      (id, date, area, divpiRaw, divisi, roleRaw, role, klassifikasiLama, issue, summary,
       l1Domain, l2ProcessArea, priority, status, routeTo, followUp, progress, ticketHc,
       urgencyLama, dedupHash, source, createdAt)
    VALUES
      (@id, @date, @area, @divpiRaw, @divisi, @roleRaw, @role, @klassifikasiLama, @issue, @summary,
       @l1Domain, @l2ProcessArea, @priority, @status, @routeTo, @followUp, @progress, @ticketHc,
       @urgencyLama, @dedupHash, 'excel', @createdAt)
  `);

  const tx = db.transaction(() => {
    for (const iss of data) {
      insert.run({
        ...iss,
        dedupHash: computeDedupHash(iss.area, iss.date, iss.divisi, iss.role, iss.issue),
        createdAt: iss.date + "T00:00:00",
      });
    }
  });
  tx();
}

/** SQLite only (this serverless instance). */
export function getAllIssuesLocal(): Issue[] {
  const db = getDb();
  return db.prepare("SELECT * FROM issues ORDER BY date DESC").all() as Issue[];
}

export function mergeIssueLists(local: Issue[], remote: Issue[]): Issue[] {
  const byId = new Map<string, Issue>();
  for (const row of remote) byId.set(row.id, row);
  for (const row of local) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export async function getAllIssues(): Promise<Issue[]> {
  if (!isBlobReplicaEnabled()) {
    const rows = getAllIssuesLocal().map(applyBundledSeedDate);
    issueSyncTrace("getAllIssues:noBlob", { count: rows.length });
    return rows;
  }
  const localIds = new Set(getAllIssuesLocal().map((i) => i.id));
  issueSyncTrace("getAllIssues:start", { localRowCount: localIds.size });
  const extra = await replicaLoadIssuesMissingFromBlob(localIds);
  for (const iss of extra) {
    upsertIssueLocal(rowToIssueRow(iss));
  }
  const out = getAllIssuesLocal().map(applyBundledSeedDate);
  issueSyncTrace("getAllIssues:afterHydrate", {
    hydratedRows: extra.length,
    totalRows: out.length,
  });
  return out;
}

function getIssueLocal(id: string): Issue | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM issues WHERE id = ?").get(id) as Issue | undefined;
}

export async function getIssue(id: string): Promise<Issue | undefined> {
  let issue = getIssueLocal(id);
  if (!issue && isBlobReplicaEnabled()) {
    issue = await replicaLoadIssue(id);
  }
  if (!issue) return undefined;
  return applyBundledSeedDate(issue);
}

function upsertIssueLocal(row: IssueRow): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO issues
      (id, date, area, divpiRaw, divisi, roleRaw, role, klassifikasiLama, issue, summary,
       l1Domain, l2ProcessArea, priority, status, routeTo, followUp, progress, ticketHc,
       urgencyLama, dedupHash, source, createdAt)
    VALUES
      (@id, @date, @area, @divpiRaw, @divisi, @roleRaw, @role, @klassifikasiLama, @issue, @summary,
       @l1Domain, @l2ProcessArea, @priority, @status, @routeTo, @followUp, @progress, @ticketHc,
       @urgencyLama, @dedupHash, @source, @createdAt)
  `).run(row);
}

function rowToIssueRow(issue: Issue): IssueRow {
  const r = issue as Issue & { dedupHash?: string; source?: string; createdAt?: string };
  return {
    ...issue,
    dedupHash: r.dedupHash ?? computeDedupHash(issue.area, issue.date, issue.divisi, issue.role, issue.issue),
    source: r.source ?? "manual",
    createdAt: r.createdAt ?? new Date().toISOString(),
  };
}

export async function updateIssue(id: string, updates: Partial<Issue>): Promise<Issue | undefined> {
  getDb();
  let existing = getIssueLocal(id) as IssueRow | undefined;
  if (!existing) {
    const fromRemote = await getIssue(id);
    if (!fromRemote) return undefined;
    existing = rowToIssueRow(fromRemote);
    upsertIssueLocal(existing);
  }

  const fields = Object.keys(updates) as (keyof Issue)[];
  if (fields.length === 0) {
    return { ...existing, ...applyBundledSeedDate(existing) } as IssueRow;
  }

  assertBlobReplicaForVercelWrites();

  const db = getDb();
  const sets = fields.map((f) => `${f} = @${f}`).join(", ");
  db.prepare(`UPDATE issues SET ${sets} WHERE id = @id`).run({ ...updates, id });
  let updated = getIssueLocal(id) as IssueRow;
  if (updated) {
    updated = { ...updated, ...applyBundledSeedDate(updated) } as IssueRow;
  }

  const l1Touched =
    updates.l1Domain !== undefined && updates.l1Domain !== existing.l1Domain;
  const l2Touched =
    updates.l2ProcessArea !== undefined &&
    updates.l2ProcessArea !== existing.l2ProcessArea;
  if (updated && (l1Touched || l2Touched)) {
    try {
      const { recordManualClassificationLearning } = await import(
        "./classification-learning"
      );
      const issueText = [
        updated.issue,
        updated.summary,
        updated.klassifikasiLama,
        updated.followUp,
      ]
        .filter(Boolean)
        .join(" ");
      await recordManualClassificationLearning({
        issueId: id,
        issueText,
        prevL1: existing.l1Domain ?? "",
        newL1: updated.l1Domain ?? "",
        prevL2: existing.l2ProcessArea ?? "",
        newL2: updated.l2ProcessArea ?? "",
      });
    } catch (e) {
      console.error("classification learning:", e);
    }
  }

  if (
    updated &&
    (updates.l1Domain !== undefined || updates.l2ProcessArea !== undefined)
  ) {
    await reopenGroupIfNeeded(updated.l1Domain, updated.l2ProcessArea);
  }
  if (updated && isBlobReplicaEnabled()) {
    await replicaPutIssue(updated);
  }
  return updated;
}

export function issueExistsByHashLocal(hash: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT 1 FROM issues WHERE dedupHash = ? LIMIT 1").get(hash);
  return !!row;
}

export async function issueExistsByHash(hash: string): Promise<boolean> {
  if (issueExistsByHashLocal(hash)) return true;
  if (!isBlobReplicaEnabled()) return false;
  const remote = await replicaLoadAllIssues();
  for (const iss of remote) {
    const extra = iss as Issue & { dedupHash?: string };
    const h = extra.dedupHash ?? computeDedupHash(iss.area, iss.date, iss.divisi, iss.role, iss.issue);
    if (h === hash) return true;
  }
  return false;
}

function maxIssueNumericId(issues: Issue[]): number {
  let max = 0;
  for (const i of issues) {
    const m = i.id.match(/^ISS-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

async function getNextIdMerged(): Promise<string> {
  const local = getAllIssuesLocal();
  let max = maxIssueNumericId(local);
  if (isBlobReplicaEnabled()) {
    const blobMax = await replicaMaxIssueSerialFromPaths();
    max = Math.max(max, blobMax);
  }
  const n = max + 1;
  if (n <= 0) return "ISS-0001";
  return `ISS-${String(n).padStart(4, "0")}`;
}

export async function insertIssue(issue: Omit<Issue, "id"> & { dedupHash: string; source: string }): Promise<Issue> {
  assertBlobReplicaForVercelWrites();
  const db = getDb();
  const id = await getNextIdMerged();
  db.prepare(`
    INSERT INTO issues
      (id, date, area, divpiRaw, divisi, roleRaw, role, klassifikasiLama, issue, summary,
       l1Domain, l2ProcessArea, priority, status, routeTo, followUp, progress, ticketHc,
       urgencyLama, dedupHash, source, createdAt)
    VALUES
      (@id, @date, @area, @divpiRaw, @divisi, @roleRaw, @role, @klassifikasiLama, @issue, @summary,
       @l1Domain, @l2ProcessArea, @priority, @status, @routeTo, @followUp, @progress, @ticketHc,
       @urgencyLama, @dedupHash, @source, datetime('now'))
  `).run({ id, ...issue });

  await reopenGroupIfNeeded(issue.l1Domain, issue.l2ProcessArea);

  const row = getIssueLocal(id) as IssueRow;
  if (!isBlobReplicaEnabled()) {
    issueSyncTrace("insertIssue:localOnly", { id });
    return row;
  }
  try {
    await replicaPutIssue(row);
    issueSyncTrace("insertIssue:blobPutOk", { id });
  } catch (e) {
    console.error("[issue-manager] replicaPutIssue failed for", id, e);
    issueSyncTrace("insertIssue:blobPutFail", {
      id,
      message: e instanceof Error ? e.message : String(e),
    });
    throw new Error(
      "Could not save issue to Blob replica; issue exists only on this server instance. Check BLOB_READ_WRITE_TOKEN and Vercel Blob.",
    );
  }
  return row;
}

export async function bulkInsert(
  rows: (Omit<Issue, "id"> & { dedupHash: string; source: string })[],
): Promise<{ inserted: number; skipped: number; newIds: string[] }> {
  let inserted = 0;
  let skipped = 0;
  const newIds: string[] = [];

  let remoteHashSet: Set<string> | null = null;
  async function hashExistsOnBlob(hash: string): Promise<boolean> {
    if (!isBlobReplicaEnabled()) return false;
    if (!remoteHashSet) {
      const remote = await replicaLoadAllIssues();
      remoteHashSet = new Set(
        remote.map((iss) => {
          const extra = iss as Issue & { dedupHash?: string };
          return (
            extra.dedupHash ??
            computeDedupHash(iss.area, iss.date, iss.divisi, iss.role, iss.issue)
          );
        }),
      );
    }
    return remoteHashSet.has(hash);
  }

  for (const row of rows) {
    if (issueExistsByHashLocal(row.dedupHash) || (await hashExistsOnBlob(row.dedupHash))) {
      skipped++;
      continue;
    }
    const iss = await insertIssue(row);
    newIds.push(iss.id);
    inserted++;
  }

  return { inserted, skipped, newIds };
}

export type IssueSyncDiagnostics = {
  recordedAt: string;
  vercel: boolean;
  region?: string;
  disableJsonSeed: boolean;
  blob: {
    configured: boolean;
    listError?: string;
    issueFileCount: number;
    pathSample: string[];
    unparseablePathnames: string[];
    maxSerialFromPaths: number;
  };
  sqlite: {
    rowCountBeforeHydrate: number;
    rowCountAfterHydrate: number;
    maxSerialBefore: number;
    maxSerialAfter: number;
  };
  diff: {
    onBlobNotInSqliteCount: number;
    onBlobNotInSqliteSample: string[];
    onSqliteNotInBlobCount: number;
    onSqliteNotInBlobSample: string[];
  };
  probe: {
    firstMissingId: string | null;
    singleIdFetchFromBlobOk: boolean | null;
  };
  /** Actionable hints for operators */
  interpret: string[];
};

/**
 * Snapshot for support: Blob vs SQLite on **this** serverless instance, then runs `getAllIssues()` once.
 * Call via `POST /api/admin/diagnostics` (same secret as reset).
 */
export async function getIssueSyncDiagnostics(): Promise<IssueSyncDiagnostics> {
  getDb();
  const recordedAt = new Date().toISOString();
  const localBefore = getAllIssuesLocal();
  const localIds = new Set(localBefore.map((i) => i.id));
  const pathSample: string[] = [];
  const unparseablePathnames: string[] = [];
  const blobIds = new Set<string>();
  let listError: string | undefined;
  let issueFileCount = 0;

  if (isBlobReplicaEnabled()) {
    const { metas, listError: le } = await listIssueBlobMetasExcludingGroups();
    listError = le;
    issueFileCount = metas.length;
    pathSample.push(...metas.slice(0, 5).map((m) => m.pathname));
    for (const m of metas) {
      const id = issueIdFromBlobPathname(m.pathname);
      if (id) blobIds.add(id);
      else unparseablePathnames.push(m.pathname);
    }
  }

  const onBlobNotLocal = [...blobIds].filter((id) => !localIds.has(id)).sort((a, b) => {
    const na = parseInt(a.replace(/^ISS-/i, ""), 10) || 0;
    const nb = parseInt(b.replace(/^ISS-/i, ""), 10) || 0;
    return nb - na;
  });
  const onLocalNotBlob = [...localIds].filter((id) => !blobIds.has(id));

  const maxSerialBlob = isBlobReplicaEnabled()
    ? await replicaMaxIssueSerialFromPaths()
    : 0;

  const firstMissing = onBlobNotLocal[0] ?? null;
  let singleFetchOk: boolean | null = null;
  if (firstMissing && isBlobReplicaEnabled()) {
    const one = await replicaLoadIssue(firstMissing);
    singleFetchOk = one != null;
  }

  await getAllIssues();
  const localAfter = getAllIssuesLocal();

  const interpret: string[] = [];
  if (!isBlobReplicaEnabled()) {
    interpret.push(
      "Blob replica is OFF (no BLOB_READ_WRITE_TOKEN). New rows only exist on the Lambda that inserted them.",
    );
  }
  if (listError) {
    interpret.push(`Blob list failed: ${listError}`);
  }
  if (unparseablePathnames.length > 0) {
    interpret.push(
      `${unparseablePathnames.length} blob path(s) did not match ISS-(digits).json; those objects are skipped for hydration.`,
    );
  }
  if (
    onBlobNotLocal.length > 0 &&
    localAfter.length <= localBefore.length
  ) {
    interpret.push(
      "Blob lists IDs not present in SQLite, but SQLite row count did not increase after hydration — JSON fetch may be failing (see probe, enable ISSUE_MANAGER_TRACE_LOG=1).",
    );
  }
  if (firstMissing && singleFetchOk === false) {
    interpret.push(
      `Direct fetch for ${firstMissing} from Blob failed — check BLOB_STORE_ACCESS (private vs public) and token scope.`,
    );
  }
  if (
    isBlobReplicaEnabled() &&
    onBlobNotLocal.length === 0 &&
    onLocalNotBlob.length > 0 &&
    onLocalNotBlob.length < 5
  ) {
    interpret.push(
      "A few SQLite IDs are absent from Blob; they may be new inserts still replicating or local-only if puts failed.",
    );
  }

  return {
    recordedAt,
    vercel: Boolean(process.env.VERCEL),
    region: process.env.VERCEL_REGION,
    disableJsonSeed: process.env.DISABLE_ISSUE_JSON_SEED === "1",
    blob: {
      configured: isBlobReplicaEnabled(),
      listError,
      issueFileCount,
      pathSample,
      unparseablePathnames: unparseablePathnames.slice(0, 15),
      maxSerialFromPaths: maxSerialBlob,
    },
    sqlite: {
      rowCountBeforeHydrate: localBefore.length,
      rowCountAfterHydrate: localAfter.length,
      maxSerialBefore: maxIssueNumericId(localBefore),
      maxSerialAfter: maxIssueNumericId(localAfter),
    },
    diff: {
      onBlobNotInSqliteCount: onBlobNotLocal.length,
      onBlobNotInSqliteSample: onBlobNotLocal.slice(0, 25),
      onSqliteNotInBlobCount: onLocalNotBlob.length,
      onSqliteNotInBlobSample: onLocalNotBlob.slice(0, 15),
    },
    probe: {
      firstMissingId: firstMissing,
      singleIdFetchFromBlobOk: singleFetchOk,
    },
    interpret,
  };
}

export async function countBy(field: keyof Issue): Promise<Record<string, number>> {
  const issues = await getAllIssues();
  const result: Record<string, number> = {};
  for (const i of issues) {
    const v = String(i[field]);
    result[v] = (result[v] || 0) + 1;
  }
  return result;
}

export function topValuesFromIssues(
  issues: Issue[],
  field: keyof Issue,
  limit = 10,
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const i of issues) {
    const v = String(i[field]);
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function topValues(field: keyof Issue, limit = 10): Promise<{ label: string; count: number }[]> {
  const issues = await getAllIssues();
  return topValuesFromIssues(issues, field, limit);
}

export async function findSimilar(issue: Issue, limit = 5, resolvedOnly = false): Promise<Issue[]> {
  const all = await getAllIssues();
  const pool = all.filter((i) => {
    if (i.id === issue.id) return false;
    if (resolvedOnly && !["Resolved", "Closed"].includes(i.status)) return false;
    return true;
  });

  const words = new Set(
    issue.issue
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );

  return pool
    .map((i) => {
      const iWords = new Set(
        i.issue
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 3),
      );
      let overlap = 0;
      for (const w of words) if (iWords.has(w)) overlap++;
      const jaccard = overlap / (words.size + iWords.size - overlap || 1);
      const sameL2 = i.l2ProcessArea === issue.l2ProcessArea ? 0.3 : 0;
      const sameArea = i.area === issue.area ? 0.1 : 0;
      return { issue: i, score: jaccard + sameL2 + sameArea };
    })
    .filter((x) => x.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.issue);
}

export async function findSimilarByText(
  text: string,
  l2: string,
  area: string,
  limit = 5,
): Promise<Issue[]> {
  const dummyIssue: Issue = {
    id: "__query__",
    date: "",
    area,
    divpiRaw: "",
    divisi: "",
    roleRaw: "",
    role: "",
    klassifikasiLama: "",
    issue: text,
    summary: "",
    l1Domain: "",
    l2ProcessArea: l2,
    priority: "",
    status: "",
    routeTo: "",
    followUp: "",
    progress: "",
    ticketHc: "",
    urgencyLama: "",
  };
  return findSimilar(dummyIssue, limit, true);
}

export interface PatternCluster {
  l2: string;
  l3Hint: string;
  count: number;
  areas: string[];
  isSystemic: boolean;
  sampleIds: string[];
}

export function detectPatternsFromIssues(issues: Issue[]): PatternCluster[] {
  const groups: Record<string, Issue[]> = {};
  for (const iss of issues) {
    const key = iss.l2ProcessArea;
    if (!groups[key]) groups[key] = [];
    groups[key].push(iss);
  }

  const clusters: PatternCluster[] = [];
  for (const [l2, items] of Object.entries(groups)) {
    if (items.length < 5) continue;
    const areas = [...new Set(items.map((i) => i.area))];
    clusters.push({
      l2,
      l3Hint: `${l2} issues`,
      count: items.length,
      areas,
      isSystemic: areas.length >= 5,
      sampleIds: items.slice(0, 3).map((i) => i.id),
    });
  }

  return clusters.sort((a, b) => b.count - a.count);
}

export async function detectPatterns(): Promise<PatternCluster[]> {
  return detectPatternsFromIssues(await getAllIssues());
}

export async function getTotalCount(): Promise<number> {
  const issues = await getAllIssues();
  return issues.length;
}

export async function getDistinctAreas(): Promise<string[]> {
  const issues = await getAllIssues();
  return [...new Set(issues.map((i) => i.area))].sort();
}

// --- Issue Groups ---

export type { IssueGroup } from "./types";

function mergeGroupLists(local: IssueGroup[], remote: IssueGroup[]): IssueGroup[] {
  const map = new Map<string, IssueGroup>();
  for (const g of remote) map.set(g.groupKey, g);
  for (const g of local) map.set(g.groupKey, g);
  return [...map.values()].sort(
    (a, b) =>
      a.l1Domain.localeCompare(b.l1Domain) ||
      a.l2ProcessArea.localeCompare(b.l2ProcessArea),
  );
}

function getAllIssueGroupsLocal(): IssueGroup[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM issue_groups ORDER BY l1Domain, l2ProcessArea")
    .all() as IssueGroup[];
}

async function syncGroupsToReplica(): Promise<void> {
  if (!isBlobReplicaEnabled()) return;
  await replicaPutAllGroups(getAllIssueGroupsLocal());
}

/** Merged SQLite (this instance) + Blob; local wins on same groupKey. */
export async function getAllIssueGroups(): Promise<IssueGroup[]> {
  const local = getAllIssueGroupsLocal();
  if (!isBlobReplicaEnabled()) return local;
  const remote = await replicaLoadGroups();
  return mergeGroupLists(local, remote);
}

export function getIssueGroup(l1: string, l2: string): IssueGroup | undefined {
  const db = getDb();
  const key = `${l1}::${l2}`;
  return db.prepare("SELECT * FROM issue_groups WHERE groupKey = ?").get(key) as IssueGroup | undefined;
}

export async function acknowledgeGroup(
  l1: string,
  l2: string,
  by: string,
): Promise<void> {
  const db = getDb();
  const key = `${l1}::${l2}`;
  const count = (
    db.prepare("SELECT COUNT(*) as c FROM issues WHERE l1Domain = ? AND l2ProcessArea = ?").get(l1, l2) as { c: number }
  ).c;
  db.prepare(`
    INSERT INTO issue_groups (groupKey, l1Domain, l2ProcessArea, status, acknowledgedAt, acknowledgedBy, issueCountAtAck)
    VALUES (@key, @l1, @l2, 'acknowledged', datetime('now'), @by, @count)
    ON CONFLICT(groupKey) DO UPDATE SET
      status = 'acknowledged',
      acknowledgedAt = datetime('now'),
      acknowledgedBy = @by,
      issueCountAtAck = @count,
      reopenedAt = NULL
  `).run({ key, l1, l2, by, count });
  await syncGroupsToReplica();
}

export async function reopenGroupIfNeeded(l1: string, l2: string): Promise<void> {
  const db = getDb();
  const key = `${l1}::${l2}`;
  const group = db.prepare("SELECT * FROM issue_groups WHERE groupKey = ?").get(key) as IssueGroup | undefined;
  if (!group || group.status !== "acknowledged") return;

  const currentCount = (
    db.prepare("SELECT COUNT(*) as c FROM issues WHERE l1Domain = ? AND l2ProcessArea = ?").get(l1, l2) as { c: number }
  ).c;
  if (currentCount > group.issueCountAtAck) {
    db.prepare("UPDATE issue_groups SET status = 'reopened', reopenedAt = datetime('now') WHERE groupKey = ?").run(key);
    await syncGroupsToReplica();
  }
}

export interface GroupSummary {
  l1Domain: string;
  l2ProcessArea: string;
  issueCount: number;
  openCount: number;
  resolvedCount: number;
  areas: string[];
  groupStatus: string;
  acknowledgedAt: string | null;
  reopenedAt: string | null;
  newSinceAck: number;
  sampleSummaries: string[];
}

export async function getGroupSummaries(): Promise<GroupSummary[]> {
  const issues = await getAllIssues();
  const groups: Record<string, Issue[]> = {};

  for (const iss of issues) {
    const key = `${iss.l1Domain}::${iss.l2ProcessArea}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(iss);
  }

  const ackMap = new Map<string, IssueGroup>();
  for (const g of await getAllIssueGroups()) {
    ackMap.set(g.groupKey, g);
  }

  const summaries: GroupSummary[] = [];
  for (const [key, items] of Object.entries(groups)) {
    const [l1, l2] = key.split("::");
    const ack = ackMap.get(key);
    const areas = [...new Set(items.map((i) => i.area))];
    const openCount = items.filter((i) => !["Resolved", "Closed", "Duplicate"].includes(i.status)).length;
    const resolvedCount = items.filter((i) => ["Resolved", "Closed"].includes(i.status)).length;

    const uniqueSummaries = [...new Set(items.map((i) => i.summary))];
    const sampleSummaries = uniqueSummaries.slice(0, 3);

    summaries.push({
      l1Domain: l1,
      l2ProcessArea: l2,
      issueCount: items.length,
      openCount,
      resolvedCount,
      areas,
      groupStatus: ack?.status || "open",
      acknowledgedAt: ack?.acknowledgedAt || null,
      reopenedAt: ack?.reopenedAt || null,
      newSinceAck: ack ? items.length - ack.issueCountAtAck : 0,
      sampleSummaries,
    });
  }

  return summaries.sort((a, b) => b.issueCount - a.issueCount);
}
