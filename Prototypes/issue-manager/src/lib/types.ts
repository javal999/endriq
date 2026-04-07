/** Acknowledgment row for L1+L2 issue clusters (SQLite + optional Blob replica). */
export interface IssueGroup {
  groupKey: string;
  l1Domain: string;
  l2ProcessArea: string;
  status: string;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  reopenedAt: string | null;
  issueCountAtAck: number;
}

export interface Issue {
  id: string;
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

export const STATUSES = [
  "New",
  "Triaged",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
  "Duplicate",
] as const;

export const PRIORITIES = [
  "P1-Critical",
  "P2-High",
  "P3-Medium",
  "P4-Low",
] as const;

export const L1_DOMAINS = [
  "System",
  "Process",
  "Data",
  "People",
  "Infrastructure",
  "Coordination",
] as const;

export const L2_AREAS = [
  "SFM/SO",
  "DO",
  "Picking",
  "Packing/Dispatch",
  "Inbound",
  "Putaway",
  "DOTS/Driver",
  "Billing/Faktur",
  "Payment/AR/Parapay",
  "Retur",
  "NJ/Promotions",
  "Konsinyasi/Exagon",
  "PO/PR",
  "Master Data",
  "Network/Performance",
  "Training",
  "Other",
] as const;

export const ROUTES = [
  "Brave Hyper Care",
  "Tiga Panglima",
  "Central Ops",
  "Master Data Team",
  "IT Infra",
  "HRBP/L&D",
  "Triage Queue",
] as const;
