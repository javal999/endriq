import { getAllIssues } from "@/lib/store";
import { Badge, priorityColor, daysSince } from "@/lib/ui-helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { status: "New", label: "New", bg: "bg-blue-50", border: "border-blue-200" },
  { status: "Triaged", label: "Triaged", bg: "bg-indigo-50", border: "border-indigo-200" },
  { status: "Assigned", label: "Assigned", bg: "bg-purple-50", border: "border-purple-200" },
  { status: "In Progress", label: "In Progress", bg: "bg-amber-50", border: "border-amber-200" },
  { status: "Resolved", label: "Resolved", bg: "bg-emerald-50", border: "border-emerald-200" },
  { status: "Closed", label: "Closed", bg: "bg-gray-50", border: "border-gray-200" },
];

export default async function WorkflowPage() {
  const issues = await getAllIssues();
  const byStatus: Record<string, typeof issues> = {};
  for (const col of COLUMNS) {
    byStatus[col.status] = issues
      .filter((i) => i.status === col.status)
      .slice(0, 15);
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Workflow Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kanban view of issue lifecycle. Showing top 15 per column.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-3">Workflow Summary</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          {COLUMNS.map((col) => {
            const total = issues.filter((i) => i.status === col.status).length;
            const pct =
              issues.length === 0 ? 0 : Math.round((total / issues.length) * 100);
            return (
              <div key={col.status}>
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs text-gray-500">
                  {col.label} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colIssues = byStatus[col.status];
          const totalCount = issues.filter(
            (i) => i.status === col.status,
          ).length;
          return (
            <div
              key={col.status}
              className="flex-shrink-0 w-72"
            >
              <div
                className={`${col.bg} ${col.border} border rounded-t-xl px-4 py-3 flex items-center justify-between`}
              >
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium">
                  {totalCount}
                </span>
              </div>
              <div className="space-y-2 p-2 border border-t-0 border-gray-200 rounded-b-xl bg-white min-h-[300px]">
                {colIssues.map((iss) => {
                  const age = daysSince(iss.date);
                  return (
                    <Link
                      key={iss.id}
                      href={`/issues/${iss.id}`}
                      className="block p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-blue-600">
                          {iss.id}
                        </span>
                        <Badge className={priorityColor(iss.priority)}>
                          {iss.priority.split("-")[0]}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700 line-clamp-2 mb-1.5">
                        {iss.summary}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{iss.area}</span>
                        <span>{age}d</span>
                      </div>
                    </Link>
                  );
                })}
                {colIssues.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-8">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
