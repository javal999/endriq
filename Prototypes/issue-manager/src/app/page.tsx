import { getAllIssues, topValuesFromIssues } from "@/lib/store";
import Link from "next/link";

/** SQLite + Blob merge changes per request; must not use static shell like /issues. */
export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  sub,
  color = "bg-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={`${color} rounded-xl border border-gray-200 p-5`}>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({
  data,
  colorFn,
}: {
  data: { label: string; count: number }[];
  colorFn?: (label: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-sm">
          <span className="w-32 truncate text-right text-gray-600 text-xs">
            {d.label}
          </span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorFn ? colorFn(d.label) : "bg-blue-500"}`}
              style={{ width: `${(d.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 text-xs text-gray-500 text-right">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  const issues = await getAllIssues();
  const total = issues.length;
  const open = issues.filter(
    (i) => !["Closed", "Resolved", "Duplicate"].includes(i.status),
  ).length;
  const p1p2 = issues.filter(
    (i) =>
      (i.priority.includes("P1") || i.priority.includes("P2")) &&
      !["Closed", "Resolved", "Duplicate"].includes(i.status),
  ).length;
  const withTicket = issues.filter((i) => i.ticketHc).length;
  const systemNoTicket = issues.filter(
    (i) => i.l1Domain === "System" && !i.ticketHc,
  ).length;

  const statusData = topValuesFromIssues(issues, "status", 8);
  const l1Data = topValuesFromIssues(issues, "l1Domain", 8);
  const l2Data = topValuesFromIssues(issues, "l2ProcessArea", 12);
  const areaData = topValuesFromIssues(issues, "area", 10);
  const priorityData = topValuesFromIssues(issues, "priority", 5);
  const routeData = topValuesFromIssues(issues, "routeTo", 8);

  const l1ColorFn = (l: string) => {
    const m: Record<string, string> = {
      System: "bg-red-400",
      Process: "bg-blue-400",
      Data: "bg-violet-400",
      People: "bg-green-400",
      Infrastructure: "bg-orange-400",
      Coordination: "bg-cyan-400",
    };
    return m[l] || "bg-gray-400";
  };

  const prioColorFn = (l: string) => {
    if (l.includes("P1")) return "bg-red-500";
    if (l.includes("P2")) return "bg-orange-400";
    if (l.includes("P3")) return "bg-yellow-400";
    return "bg-gray-300";
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Issue volume and routing overview across 38 distribution centers
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Issues" value={total} sub="from 38 DCs" />
        <StatCard
          label="Open Issues"
          value={open}
          sub={`${Math.round((open / total) * 100)}% of total`}
          color="bg-amber-50"
        />
        <StatCard
          label="P1/P2 Open"
          value={p1p2}
          sub="need attention"
          color="bg-red-50"
        />
        <StatCard
          label="System w/o Ticket"
          value={systemNoTicket}
          sub={`${withTicket} linked to Hyper Care`}
          color="bg-orange-50"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Issues by Status
          </h2>
          <BarChart data={statusData} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Issues by Domain (L1)
          </h2>
          <BarChart data={l1Data} colorFn={l1ColorFn} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Issues by Process Area (L2)
          </h2>
          <BarChart data={l2Data} colorFn={() => "bg-indigo-400"} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Issues by Priority
          </h2>
          <BarChart data={priorityData} colorFn={prioColorFn} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Top 10 Areas by Volume
          </h2>
          <BarChart data={areaData} colorFn={() => "bg-teal-400"} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Issues by Routing Destination
          </h2>
          <BarChart data={routeData} colorFn={() => "bg-purple-400"} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/triage?status=New"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Triage New Issues ({issues.filter((i) => i.status === "New").length})
          </Link>
          <Link
            href="/priority"
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            View P1/P2 Queue ({p1p2})
          </Link>
          <Link
            href="/patterns"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            View Patterns
          </Link>
          <Link
            href="/issues"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Browse All Issues
          </Link>
        </div>
      </div>
    </div>
  );
}
