import { getAllIssues } from "@/lib/store";
import {
  Badge,
  priorityColor,
  statusColor,
  l1Color,
  daysSince,
  checkSlaBreach,
} from "@/lib/ui-helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function priorityScore(p: string): number {
  if (p.includes("P1")) return 4;
  if (p.includes("P2")) return 3;
  if (p.includes("P3")) return 2;
  return 1;
}

export default async function PriorityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filterRoute = params.route;

  const openStatuses = ["New", "Triaged", "Assigned", "In Progress"];
  const allIssues = await getAllIssues();
  let issues = allIssues.filter((i) => openStatuses.includes(i.status));

  if (filterRoute) {
    issues = issues.filter((i) => i.routeTo === filterRoute);
  }

  issues.sort((a, b) => {
    const ps = priorityScore(b.priority) - priorityScore(a.priority);
    if (ps !== 0) return ps;
    return daysSince(b.date) - daysSince(a.date);
  });

  const routes = [...new Set(allIssues.map((i) => i.routeTo))].sort();

  return (
    <div className="p-6 max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Priority Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          {issues.length} open issues sorted by priority and age.
          {filterRoute && ` Filtered: ${filterRoute}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/priority"
          className={`px-3 py-1.5 rounded-lg text-sm border ${!filterRoute ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
        >
          All Teams
        </Link>
        {routes.map((r) => (
          <Link
            key={r}
            href={`/priority?route=${encodeURIComponent(r)}`}
            className={`px-3 py-1.5 rounded-lg text-sm border ${filterRoute === r ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
          >
            {r}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 font-medium w-8">#</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Summary</th>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">L1/L2</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Route</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {issues.slice(0, 100).map((iss, idx) => {
              const age = daysSince(iss.date);
              const isSlaBreach = checkSlaBreach(iss.priority, age);
              return (
                <tr
                  key={iss.id}
                  className={`hover:bg-gray-50 ${isSlaBreach ? "bg-red-50/50" : ""}`}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-400">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/issues/${iss.id}`}
                      className="text-blue-600 font-mono text-xs hover:underline"
                    >
                      {iss.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={priorityColor(iss.priority)}>
                      {iss.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <span
                      className={`font-medium ${age > 14 ? "text-red-600" : age > 7 ? "text-orange-600" : "text-gray-600"}`}
                    >
                      {age}d
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <Link
                      href={`/issues/${iss.id}`}
                      className="text-xs text-gray-700 hover:text-blue-600 line-clamp-1"
                    >
                      {iss.summary}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{iss.area}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={l1Color(iss.l1Domain)}>
                      {iss.l1Domain}
                    </Badge>
                    <span className="text-xs text-gray-400 ml-1">
                      / {iss.l2ProcessArea}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={statusColor(iss.status)}>
                      {iss.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {iss.routeTo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {issues.length > 100 && (
          <div className="px-4 py-3 text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
            Showing top 100 of {issues.length} open issues.
          </div>
        )}
      </div>
    </div>
  );
}
