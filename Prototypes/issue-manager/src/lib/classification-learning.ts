import fs from "fs";
import path from "path";
import { getDb } from "./db";
import {
  emptyLearnedClassificationPayload,
  isBlobReplicaEnabled,
  replicaLoadLearnedClassification,
  replicaPutLearnedClassification,
  type LearnedClassificationPayload,
} from "./issue-blob-sync";
import { L1_DOMAINS, L2_AREAS } from "./types";

const L2_SET = new Set<string>(L2_AREAS as unknown as string[]);
const L1_SET = new Set<string>(L1_DOMAINS as unknown as string[]);

const LEARN_BUMP = 1.25;
const LEARN_DECAY = 0.45;
const CACHE_TTL_MS = 45_000;

function dataDir(): string {
  if (process.env.VERCEL) return "/tmp/issue-manager-data";
  return path.join(process.cwd(), "data");
}

const LOCAL_LEARNED_PATH = path.join(dataDir(), "learned_classification.json");

let cache: { payload: LearnedClassificationPayload; at: number } | null = null;

export function invalidateLearnedClassificationCache(): void {
  cache = null;
}

/** Tokens ≥ minLen; Unicode letters/numbers (Bahasa + Latin). */
export function tokenizeForLearning(text: string, minLen = 4): string[] {
  const m = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  if (!m) return [];
  const out = new Set<string>();
  for (const w of m) {
    if (w.length >= minLen) out.add(w);
    if (out.size >= 120) break;
  }
  return [...out];
}

function mergePayloads(
  a: LearnedClassificationPayload,
  b: LearnedClassificationPayload,
): LearnedClassificationPayload {
  const wordL2: Record<string, Record<string, number>> = structuredClone(a.wordL2);
  for (const [w, inner] of Object.entries(b.wordL2)) {
    if (!wordL2[w]) wordL2[w] = {};
    for (const [l2, val] of Object.entries(inner)) {
      wordL2[w][l2] = (wordL2[w][l2] || 0) + val;
    }
  }
  const wordL1: Record<string, Record<string, number>> = structuredClone(a.wordL1);
  for (const [w, inner] of Object.entries(b.wordL1)) {
    if (!wordL1[w]) wordL1[w] = {};
    for (const [l1, val] of Object.entries(inner)) {
      wordL1[w][l1] = (wordL1[w][l1] || 0) + val;
    }
  }
  return { version: 1, wordL2, wordL1 };
}

function loadLocalPayload(): LearnedClassificationPayload {
  try {
    if (!fs.existsSync(LOCAL_LEARNED_PATH)) return emptyLearnedClassificationPayload();
    const raw = JSON.parse(fs.readFileSync(LOCAL_LEARNED_PATH, "utf8")) as Record<string, unknown>;
    if (raw.version !== 1) return emptyLearnedClassificationPayload();
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

function writeLocalPayload(p: LearnedClassificationPayload): void {
  const dir = path.dirname(LOCAL_LEARNED_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LOCAL_LEARNED_PATH, JSON.stringify(p), "utf8");
}

async function loadPayloadFresh(): Promise<LearnedClassificationPayload> {
  const fromBlob = isBlobReplicaEnabled()
    ? await replicaLoadLearnedClassification()
    : emptyLearnedClassificationPayload();
  return mergePayloads(fromBlob, loadLocalPayload());
}

async function loadPayloadCached(): Promise<LearnedClassificationPayload> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return structuredClone(cache.payload);
  }
  const merged = await loadPayloadFresh();
  cache = { payload: structuredClone(merged), at: Date.now() };
  return merged;
}

async function savePayload(p: LearnedClassificationPayload): Promise<void> {
  writeLocalPayload(p);
  if (isBlobReplicaEnabled()) {
    await replicaPutLearnedClassification(p);
  }
  invalidateLearnedClassificationCache();
}

/** Sum learned weights per L2 for tokens in `text`. */
export async function getLearnedL2BonusForText(text: string): Promise<Record<string, number>> {
  const p = await loadPayloadCached();
  const tokens = tokenizeForLearning(text);
  const out: Record<string, number> = {};
  for (const tok of tokens) {
    const byL2 = p.wordL2[tok];
    if (!byL2) continue;
    for (const [l2, w] of Object.entries(byL2)) {
      if (L2_SET.has(l2)) out[l2] = (out[l2] || 0) + w;
    }
  }
  return out;
}

/** Sum learned weights per L1 for tokens in `text`. */
export async function getLearnedL1BonusForText(text: string): Promise<Record<string, number>> {
  const p = await loadPayloadCached();
  const tokens = tokenizeForLearning(text);
  const out: Record<string, number> = {};
  for (const tok of tokens) {
    const byL1 = p.wordL1[tok];
    if (!byL1) continue;
    for (const [l1, w] of Object.entries(byL1)) {
      if (L1_SET.has(l1)) out[l1] = (out[l1] || 0) + w;
    }
  }
  return out;
}

/**
 * Call after a human changes L1/L2 on an issue (triage or detail PATCH).
 * Updates durable learned weights (Blob + local file) and appends an audit row in SQLite.
 */
export async function recordManualClassificationLearning(args: {
  issueId: string;
  issueText: string;
  prevL1: string;
  newL1: string;
  prevL2: string;
  newL2: string;
}): Promise<void> {
  const l2Changed = args.prevL2 !== args.newL2;
  const l1Changed = args.prevL1 !== args.newL1;
  if (!l2Changed && !l1Changed) return;

  if (l2Changed && !L2_SET.has(args.newL2)) return;
  if (l1Changed && !L1_SET.has(args.newL1)) return;

  const snippet = args.issueText.slice(0, 280).replace(/\s+/g, " ").trim();
  getDb()
    .prepare(
      `INSERT INTO classification_corrections
       (issueId, createdAt, prevL1, newL1, prevL2, newL2, issueSnippet)
       VALUES (@issueId, datetime('now'), @prevL1, @newL1, @prevL2, @newL2, @snippet)`,
    )
    .run({
      issueId: args.issueId,
      prevL1: args.prevL1,
      newL1: args.newL1,
      prevL2: args.prevL2,
      newL2: args.newL2,
      snippet,
    });

  const tokens = tokenizeForLearning(args.issueText);
  if (tokens.length === 0) return;

  const payload = await loadPayloadFresh();

  for (const tok of tokens) {
    if (l2Changed && L2_SET.has(args.newL2)) {
      if (!payload.wordL2[tok]) payload.wordL2[tok] = {};
      payload.wordL2[tok][args.newL2] = (payload.wordL2[tok][args.newL2] || 0) + LEARN_BUMP;
      if (L2_SET.has(args.prevL2)) {
        const prevW = payload.wordL2[tok][args.prevL2];
        if (prevW !== undefined) {
          payload.wordL2[tok][args.prevL2] = Math.max(0, prevW - LEARN_DECAY);
        }
      }
    }
    if (l1Changed && L1_SET.has(args.newL1)) {
      if (!payload.wordL1[tok]) payload.wordL1[tok] = {};
      payload.wordL1[tok][args.newL1] = (payload.wordL1[tok][args.newL1] || 0) + LEARN_BUMP;
      if (L1_SET.has(args.prevL1)) {
        const prevW = payload.wordL1[tok][args.prevL1];
        if (prevW !== undefined) {
          payload.wordL1[tok][args.prevL1] = Math.max(0, prevW - LEARN_DECAY);
        }
      }
    }
  }

  await savePayload(payload);
}
