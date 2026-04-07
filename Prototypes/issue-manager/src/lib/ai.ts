import { L1_DOMAINS } from "./types";

const DIVISI_MAP: Record<string, string> = {
  administrator: "Administrator", admin: "Administrator", administrasi: "Administrator",
  logistik: "Logistik", logistic: "Logistik",
  absolute: "Absolute", absolut: "Absolute", absoulte: "Absolute", abso: "Absolute",
  commercial: "Commercial", tnds: "Commercial", cbd: "Commercial", sel: "Commercial",
  bcr: "BCR", finance: "Finance", hr: "HR", "hrbp dc": "HR",
  all: "All", "all division": "All",
};

const ROLE_MAP: Record<string, string> = {
  admin: "Admin", administrator: "Admin", administrasi: "Admin",
  "administrator - all": "Admin", "administrator - billing": "Admin",
  "administrator - mwh": "Admin", "administrator - nj": "Admin",
  "administrator - retur": "Admin", "administrator - b2c paranova": "Admin",
  "admin & far": "Admin", "admin dan bac": "Admin", "admin dan logistik mwh": "Admin",
  "admin mwh": "Admin",
  logistik: "Logistik", "logistik - picking": "Logistik",
  "logistic - outbond": "Logistik", logistic: "Logistik",
  storeman: "Storeman", driver: "Driver", "absolute - driver": "Driver",
  sales: "Sales", sl: "Sales", bcr: "BCR", "hrbp dc": "HRBP",
  "koor absolute": "Koordinator", "koor admin": "Koordinator", "koor logistik": "Koordinator",
  absolute: "Absolute", absolut: "Absolute", absoulte: "Absolute", abso: "Absolute",
  all: "All",
};

const L2_KEYWORDS: Record<string, string[]> = {
  "SFM/SO": ["sfm", "sales order", "so cancel", "so auto", "credit limit", "cl "],
  DO: ["delivery order", " do ", "do gantung", "do pending", "do tercetak", "do hilang", "do cancel"],
  Picking: ["picking", "picker", "pick list", "pick "],
  "Packing/Dispatch": ["packing", "dispatch", "surat jalan"],
  Inbound: ["inbound", "sendback", "send back", "gr ", "goods receipt"],
  Putaway: ["putaway", "put away", "replenish", "bin "],
  "DOTS/Driver": ["dots", "driver", "pod ", "penghantaran"],
  "Billing/Faktur": ["billing", "faktur", "invoice", "print faktur", "cetak faktur"],
  "Payment/AR/Parapay": ["parapay", " ar ", "piutang", "pelunasan", "clearing", "giro", "payment"],
  Retur: ["retur", "return"],
  "NJ/Promotions": ["nota jual", " nj ", "promosi", "tester", "foc ", "wbs"],
  "Konsinyasi/Exagon": ["konsinyasi", "konsi", "exagon"],
  "PO/PR": [" po ", "purchase order", " pr ", "procurement", "po sto"],
  "Master Data": ["masterdata", "master data", "npwp", "mapping", "customer id"],
  "Network/Performance": ["jaringan", "server", "loading", "timeout", "lambat", "freeze"],
  Training: ["training", "paham", "belum tahu", "sop", "tidak jelas"],
};

const L1_ROUTE_MAP: Record<string, string> = {
  System: "Brave Hyper Care",
  Process: "Tiga Panglima",
  Data: "Master Data Team",
  People: "HRBP/L&D",
  Infrastructure: "IT Infra",
  Coordination: "Central Ops",
};

export function normalizeDivisi(raw: string): string {
  if (!raw || raw === "0") return "Unknown";
  return DIVISI_MAP[raw.toLowerCase().trim()] || "Other";
}

export function normalizeRole(raw: string): string {
  if (!raw || raw === "0") return "Unknown";
  return ROLE_MAP[raw.toLowerCase().trim()] || "Other";
}

function computeStaticL2Scores(text: string): Record<string, number> {
  const t = " " + text.toLowerCase() + " ";
  const scores: Record<string, number> = {};
  for (const [l2, kws] of Object.entries(L2_KEYWORDS)) {
    const score = kws.filter((kw) => t.includes(kw)).length;
    if (score > 0) scores[l2] = score;
  }
  return scores;
}

/** Keyword baseline plus optional weights from manual triage corrections (`classification-learning`). */
export function classifyL2(text: string, learnedBonus?: Record<string, number>): string {
  const scores = computeStaticL2Scores(text);
  if (learnedBonus) {
    for (const [l2, w] of Object.entries(learnedBonus)) {
      if (w <= 0) continue;
      scores[l2] = (scores[l2] || 0) + w;
    }
  }
  if (Object.keys(scores).length === 0) return "Other";
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

export function classifyL1Core(klasifikasiLama: string, l2: string, text: string): string {
  const t = text.toLowerCase();
  const kl = (klasifikasiLama || "").toLowerCase().trim();
  if (kl === "system/ technology" || kl === "system/technology") return "System";
  if (kl === "people") return "People";
  if (l2 === "Master Data") return "Data";
  if (l2 === "Network/Performance") return "Infrastructure";
  if (l2 === "Training") return "People";
  if (kl === "process") return "Process";
  if (["error", "gagal", "tidak bisa", "bug"].some((w) => t.includes(w))) return "System";
  if (["koordinasi", "rdc", "ndc", "ekspedisi"].some((w) => t.includes(w))) return "Coordination";
  return "Process";
}

/**
 * Rules first; if rules yield the generic default `Process`, optional learned L1 weights from
 * manual corrections can override (conservative threshold).
 */
export function classifyL1(
  klasifikasiLama: string,
  l2: string,
  text: string,
  learnedL1Bonus?: Record<string, number>,
): string {
  const base = classifyL1Core(klasifikasiLama, l2, text);
  if (!learnedL1Bonus || Object.keys(learnedL1Bonus).length === 0) return base;
  if (base !== "Process") return base;
  const allowed = L1_DOMAINS as readonly string[];
  const top = Object.entries(learnedL1Bonus)
    .filter(([k]) => allowed.includes(k))
    .sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 1.25) return top[0];
  return base;
}

export async function classifyL2Async(text: string): Promise<string> {
  const { getLearnedL2BonusForText } = await import("./classification-learning");
  const bonus = await getLearnedL2BonusForText(text);
  return classifyL2(text, bonus);
}

export async function classifyL1Async(
  klasifikasiLama: string,
  l2: string,
  text: string,
): Promise<string> {
  const { getLearnedL1BonusForText } = await import("./classification-learning");
  const bonus = await getLearnedL1BonusForText(text);
  return classifyL1(klasifikasiLama, l2, text, bonus);
}

export function deriveRoute(l1: string): string {
  return L1_ROUTE_MAP[l1] || "Triage Queue";
}

export function derivePriority(l2: string, text: string, urgency: string): string {
  const u = (urgency || "").toLowerCase().trim();
  if (u === "critical") return "P1-Critical";
  if (u === "high") return "P2-High";
  if (u === "medium") return "P3-Medium";
  const t = text.toLowerCase();
  if (["tidak bisa", "gagal", "block", "stop"].some((w) => t.includes(w))) return "P2-High";
  if (["Billing/Faktur", "Payment/AR/Parapay", "DO"].includes(l2)) return "P2-High";
  return "P3-Medium";
}

export function summarize(text: string): string {
  const t = text.trim();
  if (!t) return "";
  let clean = t.replace(/^\s*(?:\d+\.\s*|[a-zA-Z]\.\s*|[-*]\s*)/, "");
  if (clean.length < 5) clean = t;
  if (clean.length < 60) return clean;
  const sentences = clean.replace(/\n/g, ". ").split(/(?<=[.!?])\s+(?=[A-Z])/);
  let first = sentences[0].trim();
  if (first.length < 5 && sentences.length > 1) {
    first = sentences.slice(0, 2).join(". ").trim();
  }
  if (first.length < 5) first = clean;
  if (first.length > 150) {
    const cut = first.substring(0, 147).lastIndexOf(" ");
    first = cut > 80 ? first.substring(0, cut) + "..." : first.substring(0, 147) + "...";
  }
  return first;
}

export interface EnrichedRow {
  date: string;
  area: string;
  divpiRaw: string;
  divisi: string;
  roleRaw: string;
  role: string;
  klassifikasiLama: string;
  issue: string;
  summary: string;
  l1Domain: string;
  l2ProcessArea: string;
  priority: string;
  status: string;
  routeTo: string;
  followUp: string;
  progress: string;
  ticketHc: string;
  urgencyLama: string;
}

export function enrichRow(raw: {
  area?: string;
  date?: string;
  divisi?: string;
  role?: string;
  klasifikasi?: string;
  issue: string;
  followUp?: string;
  progress?: string;
  urgency?: string;
  ticketNo?: string;
}): EnrichedRow {
  const area = raw.area?.trim() || "Unknown";
  const date = raw.date || new Date().toISOString().split("T")[0];
  const divisiRaw = raw.divisi?.trim() || "";
  const roleRaw = raw.role?.trim() || "";
  const klassifikasi = raw.klasifikasi?.trim() || "";
  const issue = raw.issue.trim();
  const followUp = raw.followUp?.trim() || "";
  const progress = raw.progress?.trim() || "";
  const urgency = raw.urgency?.trim() || "";
  const ticketNo = raw.ticketNo?.trim() || "";

  const l2 = classifyL2(issue);
  const l1 = classifyL1(klassifikasi, l2, issue);
  const route = deriveRoute(l1);
  const prio = derivePriority(l2, issue, urgency);
  const summary = summarize(issue);

  let status = "New";
  if (progress && ["done", "close", "selesai", "solved"].some((w) => progress.toLowerCase().includes(w))) {
    status = "Closed";
  } else if (progress) {
    status = "In Progress";
  } else if (ticketNo) {
    status = "Assigned";
  } else if (followUp) {
    status = "Triaged";
  }

  return {
    date,
    area,
    divpiRaw: divisiRaw,
    divisi: normalizeDivisi(divisiRaw),
    roleRaw,
    role: normalizeRole(roleRaw),
    klassifikasiLama: klassifikasi,
    issue,
    summary,
    l1Domain: l1,
    l2ProcessArea: l2,
    priority: prio,
    status,
    routeTo: route,
    followUp,
    progress,
    ticketHc: ticketNo,
    urgencyLama: urgency,
  };
}

/** Intake paths: applies learned L1/L2 from manual corrections (Blob + `data/learned_classification.json`). */
export async function enrichRowAsync(raw: {
  area?: string;
  date?: string;
  divisi?: string;
  role?: string;
  klasifikasi?: string;
  issue: string;
  followUp?: string;
  progress?: string;
  urgency?: string;
  ticketNo?: string;
}): Promise<EnrichedRow> {
  const area = raw.area?.trim() || "Unknown";
  const date = raw.date || new Date().toISOString().split("T")[0];
  const divisiRaw = raw.divisi?.trim() || "";
  const roleRaw = raw.role?.trim() || "";
  const klassifikasi = raw.klasifikasi?.trim() || "";
  const issue = raw.issue.trim();
  const followUp = raw.followUp?.trim() || "";
  const progress = raw.progress?.trim() || "";
  const urgency = raw.urgency?.trim() || "";
  const ticketNo = raw.ticketNo?.trim() || "";

  const l2 = await classifyL2Async(issue);
  const l1 = await classifyL1Async(klassifikasi, l2, issue);
  const route = deriveRoute(l1);
  const prio = derivePriority(l2, issue, urgency);
  const summary = summarize(issue);

  let status = "New";
  if (progress && ["done", "close", "selesai", "solved"].some((w) => progress.toLowerCase().includes(w))) {
    status = "Closed";
  } else if (progress) {
    status = "In Progress";
  } else if (ticketNo) {
    status = "Assigned";
  } else if (followUp) {
    status = "Triaged";
  }

  return {
    date,
    area,
    divpiRaw: divisiRaw,
    divisi: normalizeDivisi(divisiRaw),
    roleRaw,
    role: normalizeRole(roleRaw),
    klassifikasiLama: klassifikasi,
    issue,
    summary,
    l1Domain: l1,
    l2ProcessArea: l2,
    priority: prio,
    status,
    routeTo: route,
    followUp,
    progress,
    ticketHc: ticketNo,
    urgencyLama: urgency,
  };
}
