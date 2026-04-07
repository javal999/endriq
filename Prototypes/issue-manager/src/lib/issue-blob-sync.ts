import { del, list, put } from "@vercel/blob";
import type { Issue, IssueGroup } from "./types";
import { issueSyncTrace } from "./issue-sync-trace";

const PREFIX = "issue-manager-sync/";
/** Single JSON document; not `ISS-*.json` so issue loaders must skip it. */
const GROUPS_BLOB_PATH = `${PREFIX}_groups.json`;
/** Learned word → L1/L2 weights from manual triage corrections (cross-instance). */
export const LEARNED_CLASSIFICATION_BLOB_PATH = `${PREFIX}_learned_classification.json`;

export type LearnedClassificationPayload = {
  version: 1;
  wordL2: Record<string, Record<string, number>>;
  wordL1: Record<string, Record<string, number>>;
};

export function emptyLearnedClassificationPayload(): LearnedClassificationPayload {
  return { version: 1, wordL2: {}, wordL1: {} };
}

function blobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Private Blob stores (Vercel default when creating "Private") require put/get with access: "private".
 * Public stores require access: "public" and readable URLs. Set BLOB_STORE_ACCESS=public if your store is public.
 * @see https://vercel.com/docs/vercel-blob/private-storage
 */
function blobAccess(): "public" | "private" {
  const v = process.env.BLOB_STORE_ACCESS?.toLowerCase();
  if (v === "public") return "public";
  return "private";
}

export function isBlobReplicaEnabled(): boolean {
  return Boolean(blobToken());
}

/**
 * On Vercel, SQLite is in /tmp and is not shared across instances. Without Blob,
 * a "successful" insert only exists on one Lambda; full reload often hits another
 * instance and the row looks deleted.
 *
 * Set `ALLOW_EPHEMERAL_SQLITE_ON_VERCEL=1` only for throwaway demos (data will not survive reload).
 */
export function assertBlobReplicaForVercelWrites(): void {
  if (!process.env.VERCEL) return;
  if (process.env.ALLOW_EPHEMERAL_SQLITE_ON_VERCEL === "1") return;
  if (!isBlobReplicaEnabled()) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is required on Vercel: SQLite is per-instance /tmp, so issues vanish after reload without Vercel Blob sync. Add BLOB_READ_WRITE_TOKEN in the project Environment Variables (and redeploy). Optional: BLOB_STORE_ACCESS=public if the store is public. For intentional ephemeral demos only, set ALLOW_EPHEMERAL_SQLITE_ON_VERCEL=1.",
    );
  }
}

async function parseIssueFromBlobMeta(
  meta: { pathname: string; url: string },
  token: string,
): Promise<Issue | null> {
  if (blobAccess() === "public") {
    try {
      const r = await fetch(meta.url);
      if (!r.ok) return null;
      return (await r.json()) as Issue;
    } catch {
      return null;
    }
  }

  // Private blob URLs are not world-readable; use the read/write token (SDK "get" needs @vercel/blob >= 2.3).
  try {
    const r = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as Issue;
  } catch {
    return null;
  }
}

/** Paginate Vercel Blob `list` — a single call only returns one page (~1000); without this, issues past that page never merge from Blob. */
async function listAllBlobMetas(
  prefix: string,
  token: string,
): Promise<{ pathname: string; url: string }[]> {
  const out: { pathname: string; url: string }[] = [];
  let cursor: string | undefined;
  for (let safety = 0; safety < 500; safety++) {
    const page = await list({ prefix, token, cursor, limit: 1000 });
    out.push(...page.blobs);
    if (!page.hasMore) break;
    cursor = page.cursor;
    if (!cursor) break;
  }
  return out;
}

/** For diagnostics: all `issue-manager-sync/*.json` except `_groups.json`. */
export async function listIssueBlobMetasExcludingGroups(): Promise<{
  metas: { pathname: string; url: string }[];
  listError?: string;
}> {
  const token = blobToken();
  if (!token) return { metas: [] };
  try {
    const metas = await listAllBlobMetas(PREFIX, token);
    return {
      metas: metas.filter((m) => !m.pathname.endsWith("_groups.json")),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { metas: [], listError: msg };
  }
}

const FETCH_ISSUES_CHUNK = 80;

/** Parse `ISS-0123` from store pathname `…/ISS-0123.json`. */
export function issueIdFromBlobPathname(pathname: string): string | null {
  const m = pathname.match(/ISS-(\d+)\.json$/i);
  return m ? `ISS-${m[1]}` : null;
}

/** Max numeric ISS-* serial from blob paths only (no JSON fetch). */
export async function replicaMaxIssueSerialFromPaths(): Promise<number> {
  const token = blobToken();
  if (!token) return 0;
  try {
    const metas = await listAllBlobMetas(PREFIX, token);
    let max = 0;
    for (const m of metas) {
      if (m.pathname.endsWith("_groups.json")) continue;
      const id = issueIdFromBlobPathname(m.pathname);
      if (!id) continue;
      const num = /^ISS-(\d+)$/i.exec(id);
      if (num) max = Math.max(max, parseInt(num[1], 10));
    }
    return max;
  } catch {
    return 0;
  }
}

/**
 * Fetch issue JSON from Blob only for paths whose id is not in `localIds`.
 * Used to hydrate /tmp SQLite on cold instances so new tickets survive reload.
 */
export async function replicaLoadIssuesMissingFromBlob(
  localIds: Set<string>,
): Promise<Issue[]> {
  const token = blobToken();
  if (!token) return [];
  try {
    const metas = await listAllBlobMetas(PREFIX, token);
    const missing = metas.filter((m) => {
      if (m.pathname.endsWith("_groups.json")) return false;
      const id = issueIdFromBlobPathname(m.pathname);
      return Boolean(id && !localIds.has(id));
    });
    const results: Issue[] = [];
    let parseNulls = 0;
    for (let i = 0; i < missing.length; i += FETCH_ISSUES_CHUNK) {
      const chunk = missing.slice(i, i + FETCH_ISSUES_CHUNK);
      const parsed = await Promise.all(
        chunk.map((meta) => parseIssueFromBlobMeta(meta, token)),
      );
      for (const x of parsed) {
        if (x != null) results.push(x);
        else parseNulls++;
      }
    }
    issueSyncTrace("blob:missingHydrate", {
      missingPaths: missing.length,
      fetchedOk: results.length,
      parseNulls,
    });
    return results;
  } catch (e) {
    issueSyncTrace("blob:missingHydrateError", {
      message: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
}

/** Cross-instance replica for Vercel serverless (SQLite in /tmp is per-instance). */
export async function replicaPutIssue(issue: Issue & { dedupHash?: string; source?: string; createdAt?: string }): Promise<void> {
  const token = blobToken();
  if (!token) return;
  await put(`${PREFIX}${issue.id}.json`, JSON.stringify(issue), {
    access: blobAccess(),
    addRandomSuffix: false,
    token,
    contentType: "application/json",
  });
}

/** Full scan of all issue JSON in Blob (slow). Prefer `replicaLoadIssuesMissingFromBlob` for reads. */
export async function replicaLoadAllIssues(): Promise<Issue[]> {
  const token = blobToken();
  if (!token) return [];
  try {
    const metas = await listAllBlobMetas(PREFIX, token);
    const issueBlobs = metas.filter((m) => !m.pathname.endsWith("_groups.json"));
    const results: Issue[] = [];
    for (let i = 0; i < issueBlobs.length; i += FETCH_ISSUES_CHUNK) {
      const chunk = issueBlobs.slice(i, i + FETCH_ISSUES_CHUNK);
      const parsed = await Promise.all(
        chunk.map((meta) => parseIssueFromBlobMeta(meta, token)),
      );
      for (const x of parsed) {
        if (x != null) results.push(x);
      }
    }
    return results;
  } catch {
    return [];
  }
}

type GroupsBlobPayload = { version?: number; groups?: IssueGroup[] };

async function fetchBlobJson(url: string, token: string): Promise<unknown | null> {
  if (blobAccess() === "public") {
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  }
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/** Cross-instance replica for `issue_groups` rows (one JSON file). */
export async function replicaLoadGroups(): Promise<IssueGroup[]> {
  const token = blobToken();
  if (!token) return [];
  try {
    const { blobs } = await list({ prefix: GROUPS_BLOB_PATH, token });
    const meta = blobs[0];
    if (!meta) return [];
    const data = (await fetchBlobJson(meta.url, token)) as GroupsBlobPayload | null;
    if (!data || !Array.isArray(data.groups)) return [];
    return data.groups;
  } catch {
    return [];
  }
}

export async function replicaPutAllGroups(groups: IssueGroup[]): Promise<void> {
  const token = blobToken();
  if (!token) return;
  const body = JSON.stringify({ version: 1, groups });
  await put(GROUPS_BLOB_PATH, body, {
    access: blobAccess(),
    addRandomSuffix: false,
    token,
    contentType: "application/json",
  });
}

export async function replicaLoadLearnedClassification(): Promise<LearnedClassificationPayload> {
  const token = blobToken();
  if (!token) return emptyLearnedClassificationPayload();
  try {
    const { blobs } = await list({ prefix: LEARNED_CLASSIFICATION_BLOB_PATH, token });
    const meta = blobs[0];
    if (!meta) return emptyLearnedClassificationPayload();
    const raw = (await fetchBlobJson(meta.url, token)) as Record<string, unknown> | null;
    if (!raw || raw.version !== 1) return emptyLearnedClassificationPayload();
    const wordL2 =
      raw.wordL2 && typeof raw.wordL2 === "object"
        ? (raw.wordL2 as Record<string, Record<string, number>>)
        : {};
    const wordL1 =
      raw.wordL1 && typeof raw.wordL1 === "object"
        ? (raw.wordL1 as Record<string, Record<string, number>>)
        : {};
    return { version: 1, wordL2, wordL1 };
  } catch {
    return emptyLearnedClassificationPayload();
  }
}

export async function replicaPutLearnedClassification(
  payload: LearnedClassificationPayload,
): Promise<void> {
  const token = blobToken();
  if (!token) return;
  const body = JSON.stringify(payload);
  await put(LEARNED_CLASSIFICATION_BLOB_PATH, body, {
    access: blobAccess(),
    addRandomSuffix: false,
    token,
    contentType: "application/json",
  });
}

/** Delete every replica object (for admin reset). Returns count deleted. */
export async function deleteAllReplicaBlobs(): Promise<number> {
  const token = blobToken();
  if (!token) return 0;
  let deleted = 0;
  let cursor: string | undefined;
  for (let safety = 0; safety < 500; safety++) {
    const page = await list({ prefix: PREFIX, token, cursor, limit: 1000 });
    for (const meta of page.blobs) {
      await del(meta.url, { token });
      deleted++;
    }
    if (!page.hasMore) break;
    cursor = page.cursor;
    if (!cursor) break;
  }
  return deleted;
}

export async function replicaLoadIssue(id: string): Promise<Issue | undefined> {
  const token = blobToken();
  if (!token) return undefined;
  try {
    const { blobs } = await list({ prefix: `${PREFIX}${id}.json`, token });
    const meta = blobs[0];
    if (!meta) return undefined;
    const issue = await parseIssueFromBlobMeta(meta, token);
    return issue ?? undefined;
  } catch {
    return undefined;
  }
}
