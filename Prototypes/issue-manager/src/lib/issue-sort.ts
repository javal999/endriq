import type { Issue } from "./types";

export type IssueListSort = "id-desc" | "id-asc" | "date-desc" | "date-asc";

/** Numeric part of ISS-0123 for ordering (0 if not matched). */
export function parseIssueSerial(id: string): number {
  const m = id.match(/^ISS-(\d+)$/i);
  return m ? parseInt(m[1], 10) : 0;
}

function compareDateDesc(a: Issue, b: Issue): number {
  const c = b.date.localeCompare(a.date);
  if (c !== 0) return c;
  return parseIssueSerial(a.id) - parseIssueSerial(b.id);
}

function compareDateAsc(a: Issue, b: Issue): number {
  const c = a.date.localeCompare(b.date);
  if (c !== 0) return c;
  return parseIssueSerial(a.id) - parseIssueSerial(b.id);
}

function compareIdDesc(a: Issue, b: Issue): number {
  const c = parseIssueSerial(b.id) - parseIssueSerial(a.id);
  if (c !== 0) return c;
  return compareDateDesc(a, b);
}

function compareIdAsc(a: Issue, b: Issue): number {
  const c = parseIssueSerial(a.id) - parseIssueSerial(b.id);
  if (c !== 0) return c;
  return compareDateAsc(a, b);
}

export function normalizeIssueListSort(value: string | undefined): IssueListSort {
  if (value === "id-desc" || value === "id-asc" || value === "date-desc" || value === "date-asc") {
    return value;
  }
  return "date-desc";
}

export function sortIssuesForList(issues: Issue[], sort: IssueListSort): Issue[] {
  const copy = [...issues];
  switch (sort) {
    case "id-asc":
      copy.sort(compareIdAsc);
      break;
    case "date-desc":
      copy.sort(compareDateDesc);
      break;
    case "date-asc":
      copy.sort(compareDateAsc);
      break;
    default:
      copy.sort(compareIdDesc);
  }
  return copy;
}
