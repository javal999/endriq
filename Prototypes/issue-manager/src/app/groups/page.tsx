"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GroupSummary {
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

const L1_ORDER = ["System", "Process", "Data", "People", "Infrastructure", "Coordination"];

const L1_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  System: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", badge: "bg-red-100 text-red-700" },
  Process: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-700" },
  Data: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-800", badge: "bg-violet-100 text-violet-700" },
  People: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", badge: "bg-green-100 text-green-700" },
  Infrastructure: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-100 text-orange-700" },
  Coordination: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-800", badge: "bg-cyan-100 text-cyan-700" },
};

function StatusBadge({ group }: { group: GroupSummary }) {
  if (group.groupStatus === "acknowledged") {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-md border border-green-200">
        Acknowledged
        {group.acknowledgedAt && (
          <span className="text-green-500">({group.acknowledgedAt.split("T")[0]})</span>
        )}
      </span>
    );
  }
  if (group.groupStatus === "reopened") {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200">
        Reopened
        {group.newSinceAck > 0 && (
          <span className="font-bold">+{group.newSinceAck} new</span>
        )}
        {group.acknowledgedAt && (
          <span className="text-amber-600">(was acked {group.acknowledgedAt.split("T")[0]})</span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md border border-gray-200">
      Open
    </span>
  );
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function fetchGroups(): Promise<void> {
    try {
      const res = await fetch("/api/groups/list");
      const data = await res.json();
      setGroups(data.groups || []);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchGroups();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAcknowledge(l1: string, l2: string) {
    const key = `${l1}::${l2}`;
    setActing(key);
    try {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ l1Domain: l1, l2ProcessArea: l2, action: "acknowledge" }),
      });
      await fetchGroups();
    } catch { /* ignore */ }
    setActing(null);
  }

  const byL1: Record<string, GroupSummary[]> = {};
  for (const g of groups) {
    if (!byL1[g.l1Domain]) byL1[g.l1Domain] = [];
    byL1[g.l1Domain].push(g);
  }

  const sortedL1s = L1_ORDER.filter((l1) => byL1[l1]?.length);
  for (const l1 of Object.keys(byL1)) {
    if (!sortedL1s.includes(l1)) sortedL1s.push(l1);
  }

  const totalOpen = groups.filter((g) => g.groupStatus !== "acknowledged").length;
  const totalAcked = groups.filter((g) => g.groupStatus === "acknowledged").length;
  const totalReopened = groups.filter((g) => g.groupStatus === "reopened").length;

  return (
    <div className="p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Issue Groups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review recurring issue patterns by domain and process area. Acknowledge groups
          that have been reviewed. Groups reopen automatically when new issues arrive.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold">{totalOpen}</div>
          <div className="text-xs text-gray-500">Open Groups</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{totalAcked}</div>
          <div className="text-xs text-green-600">Acknowledged</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-700">{totalReopened}</div>
          <div className="text-xs text-amber-600">Reopened</div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 py-10 text-center">Loading groups...</div>
      ) : (
        <div className="space-y-8">
          {sortedL1s.map((l1) => {
            const l1Groups = byL1[l1];
            const colors = L1_COLORS[l1] || L1_COLORS.Process;
            const l1Total = l1Groups.reduce((s, g) => s + g.issueCount, 0);
            return (
              <div key={l1}>
                <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mb-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${colors.text}`}>{l1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md ${colors.badge}`}>
                        {l1Total} issues across {l1Groups.length} process areas
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pl-2">
                  {l1Groups.map((g) => {
                    const key = `${g.l1Domain}::${g.l2ProcessArea}`;
                    const isActing = acting === key;
                    return (
                      <div
                        key={key}
                        className={`bg-white rounded-xl border p-4 ${
                          g.groupStatus === "reopened"
                            ? "border-amber-300"
                            : g.groupStatus === "acknowledged"
                              ? "border-green-200"
                              : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {g.l2ProcessArea}
                              </span>
                              <StatusBadge group={g} />
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>{g.issueCount} total issues</span>
                              <span>{g.openCount} open</span>
                              <span>{g.resolvedCount} resolved</span>
                              <span>
                                {g.areas.length} DC{g.areas.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {g.groupStatus !== "acknowledged" && (
                              <button
                                onClick={() => handleAcknowledge(g.l1Domain, g.l2ProcessArea)}
                                disabled={isActing}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                              >
                                {isActing ? "..." : "Acknowledge"}
                              </button>
                            )}
                            <Link
                              href={`/issues?l1=${encodeURIComponent(g.l1Domain)}&l2=${encodeURIComponent(g.l2ProcessArea)}`}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                            >
                              View Issues
                            </Link>
                          </div>
                        </div>

                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">Representative issues:</p>
                          <ul className="space-y-0.5">
                            {g.sampleSummaries.map((s, i) => (
                              <li key={i} className="text-xs text-gray-600 line-clamp-1">
                                &bull; {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {g.areas.slice(0, 8).map((a) => (
                            <span
                              key={a}
                              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                            >
                              {a}
                            </span>
                          ))}
                          {g.areas.length > 8 && (
                            <span className="text-xs text-gray-400">
                              +{g.areas.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
