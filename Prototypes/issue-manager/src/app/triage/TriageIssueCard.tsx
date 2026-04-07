"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Badge,
  priorityColor,
  statusColor,
  l1Color,
  daysSince,
} from "@/lib/ui-helpers";
import { L1_DOMAINS, L2_AREAS, PRIORITIES, ROUTES } from "@/lib/types";

export type TriageIssueCardProps = {
  id: string;
  area: string;
  date: string;
  issue: string;
  l1Domain: string;
  l2ProcessArea: string;
  priority: string;
  routeTo: string;
  status: string;
};

function withFallback<T extends string>(allowed: readonly T[], current: string): T[] {
  const list = [...allowed] as T[];
  if (current && !list.includes(current as T)) {
    list.unshift(current as T);
  }
  return list;
}

function nextStatusAfterAccept(current: string): string | undefined {
  if (current === "New") return "Triaged";
  if (current === "Triaged") return "Assigned";
  return undefined;
}

export default function TriageIssueCard(props: TriageIssueCardProps) {
  const router = useRouter();
  const [l1, setL1] = useState(props.l1Domain);
  const [l2, setL2] = useState(props.l2ProcessArea);
  const [priority, setPriority] = useState(props.priority);
  const [routeTo, setRouteTo] = useState(props.routeTo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setL1(props.l1Domain);
    setL2(props.l2ProcessArea);
    setPriority(props.priority);
    setRouteTo(props.routeTo);
    setSaved(false);
    setError(null);
  }, [
    props.id,
    props.l1Domain,
    props.l2ProcessArea,
    props.priority,
    props.routeTo,
  ]);

  const age = daysSince(props.date);
  const l1Options = withFallback(L1_DOMAINS, props.l1Domain);
  const l2Options = withFallback(L2_AREAS, props.l2ProcessArea);
  const priorityOptions = withFallback(PRIORITIES, props.priority);
  const routeOptions = withFallback(ROUTES, props.routeTo);

  async function handleAccept() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, string> = {
      l1Domain: l1,
      l2ProcessArea: l2,
      priority,
      routeTo,
    };
    const next = nextStatusAfterAccept(props.status);
    if (next) body.status = next;

    const unchanged =
      l1 === props.l1Domain &&
      l2 === props.l2ProcessArea &&
      priority === props.priority &&
      routeTo === props.routeTo &&
      !next;

    if (unchanged) {
      setError("No changes to apply.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/issues/${encodeURIComponent(props.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in required to save.");
        } else {
          setError(data.error || "Save failed");
        }
        setSaving(false);
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/issues/${props.id}`}
            className="font-mono text-sm text-blue-600 hover:underline"
          >
            {props.id}
          </Link>
          <Badge className={priorityColor(props.priority)}>
            {props.priority.split("-")[0]}
          </Badge>
          <Badge className={statusColor(props.status)}>{props.status}</Badge>
          <span className="text-xs text-gray-400">
            {props.area} · {age}d ago
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{props.issue}</p>

      <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
        <p className="text-xs font-semibold text-blue-700 mb-2">AI Suggestion</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <span className="text-gray-500">Domain:</span>{" "}
            <Badge className={l1Color(props.l1Domain)}>{props.l1Domain}</Badge>
          </div>
          <div>
            <span className="text-gray-500">Process Area:</span>{" "}
            <span className="font-medium">{props.l2ProcessArea}</span>
          </div>
          <div>
            <span className="text-gray-500">Route to:</span>{" "}
            <span className="font-medium">{props.routeTo}</span>
          </div>
          <div>
            <span className="text-gray-500">Priority:</span>{" "}
            <Badge className={priorityColor(props.priority)}>{props.priority}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-400">Override:</span>
        <select
          value={l1}
          onChange={(e) => setL1(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs max-w-[140px]"
          aria-label="L1 domain override"
        >
          {l1Options.map((d) => (
            <option key={d} value={d}>
              L1: {d}
            </option>
          ))}
        </select>
        <select
          value={l2}
          onChange={(e) => setL2(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs max-w-[160px]"
          aria-label="L2 process area override"
        >
          {l2Options.map((a) => (
            <option key={a} value={a}>
              L2: {a}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs max-w-[120px]"
          aria-label="Priority override"
        >
          {priorityOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={routeTo}
          onChange={(e) => setRouteTo(e.target.value)}
          className="border border-gray-200 rounded px-2 py-1 text-xs max-w-[180px]"
          aria-label="Route override"
        >
          {routeOptions.map((r) => (
            <option key={r} value={r}>
              → {r}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAccept}
          disabled={saving}
          className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Accept & Route"}
        </button>
        <Link
          href={`/issues/${props.id}`}
          className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200"
        >
          View Detail
        </Link>
        {saved && (
          <span className="text-green-600 font-medium">Saved</span>
        )}
        {error && (
          <span className="text-red-600 flex flex-wrap items-center gap-2">
            {error}
            {error.includes("Sign in") && (
              <Link
                href="/login?returnTo=%2Ftriage"
                className="text-blue-600 underline font-medium"
              >
                Sign in
              </Link>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
