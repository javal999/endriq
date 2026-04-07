import { getAllIssues } from "@/lib/store";
import { normalizeIssueListSort, sortIssuesForList } from "@/lib/issue-sort";
import { Badge, priorityColor, statusColor, l1Color } from "@/lib/ui-helpers";
import Link from "next/link";
import { L1_DOMAINS, STATUSES, PRIORITIES } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

function buildIssuesQuery(
  p: Record<string, string | undefined>,
  overrides: Record<string, string | undefined | null>,
): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v) next[k] = v;
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === undefined || v === "") {
      delete next[k];
    } else {
      next[k] = v;
    }
  }
  if (next.page === "1") delete next.page;
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) {
    if (v) u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const allIssues = await getAllIssues();
  let issues = allIssues;

  const filterArea = params.area;
  const filterL1 = params.l1;
  const filterL2 = params.l2;
  const filterStatus = params.status;
  const filterPriority = params.priority;
  const filterRoute = params.route;
  const filterMonth = params.month;
  const search = params.q;
  const sort = normalizeIssueListSort(params.sort);

  const pageRaw = parseInt(params.page || "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  if (filterArea) issues = issues.filter((i) => i.area === filterArea);
  if (filterL1) issues = issues.filter((i) => i.l1Domain === filterL1);
  if (filterL2) issues = issues.filter((i) => i.l2ProcessArea === filterL2);
  if (filterStatus) issues = issues.filter((i) => i.status === filterStatus);
  if (filterPriority) issues = issues.filter((i) => i.priority === filterPriority);
  if (filterRoute) issues = issues.filter((i) => i.routeTo === filterRoute);
  if (filterMonth && /^\d{4}-\d{2}$/.test(filterMonth)) {
    issues = issues.filter((i) => i.date.startsWith(filterMonth));
  }
  if (search) {
    const q = search.toLowerCase();
    issues = issues.filter(
      (i) =>
        i.issue.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.area.toLowerCase().includes(q),
    );
  }

  issues = sortIssuesForList(issues, sort);

  const totalFiltered = issues.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = issues.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : startIdx + 1;
  const showingTo = startIdx + pageRows.length;

  const areas = [...new Set(allIssues.map((i) => i.area))].sort();
  const monthSet = new Set<string>();
  for (const i of allIssues) {
    const ym = i.date?.slice(0, 7);
    if (ym && /^\d{4}-\d{2}$/.test(ym)) monthSet.add(ym);
  }
  const monthOptions = [...monthSet].sort().reverse();

  const baseParams: Record<string, string | undefined> = {
    q: search,
    area: filterArea,
    l1: filterL1,
    l2: filterL2,
    status: filterStatus,
    priority: filterPriority,
    route: filterRoute,
    month: filterMonth,
    sort: sort === "date-desc" ? undefined : sort,
  };

  return (
    <div className="p-6 max-w-7xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">All Issues</h1>
          <p className="text-sm text-gray-500">
            {totalFiltered} issues
            {filterArea && ` in ${filterArea}`}
            {filterL1 && ` · ${filterL1}`}
            {filterStatus && ` · ${filterStatus}`}
            {filterMonth && ` · ${formatMonthLabel(filterMonth)}`}
          </p>
        </div>
      </div>

      <form className="flex flex-wrap gap-2 bg-white rounded-xl border border-gray-200 p-4">
        <input
          name="q"
          placeholder="Search issues..."
          defaultValue={search || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]"
        />
        <select
          name="area"
          defaultValue={filterArea || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          name="l1"
          defaultValue={filterL1 || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Domains</option>
          {L1_DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={filterStatus || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          name="priority"
          defaultValue={filterPriority || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          name="month"
          defaultValue={filterMonth || ""}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[10rem]"
        >
          <option value="">All months</option>
          {monthOptions.map((ym) => (
            <option key={ym} value={ym}>
              {formatMonthLabel(ym)}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm min-w-[14rem]"
          title="Order rows in the table"
        >
          <option value="date-desc">Newest date first, same day lowest ID</option>
          <option value="date-asc">Oldest date first, same day lowest ID</option>
          <option value="id-desc">Newest ticket ID first</option>
          <option value="id-asc">Oldest ticket ID first</option>
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Filter
        </button>
        <Link
          href="/issues"
          className="text-sm text-gray-500 px-3 py-1.5 hover:text-gray-700 self-center"
        >
          Reset
        </Link>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Summary</th>
                <th className="px-4 py-3 font-medium">L1</th>
                <th className="px-4 py-3 font-medium">L2</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Route</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((iss) => (
                <tr key={iss.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/issues/${iss.id}`}
                      className="text-blue-600 font-mono text-xs hover:underline"
                    >
                      {iss.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {iss.date}
                  </td>
                  <td className="px-4 py-2.5 text-xs">{iss.area}</td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <Link
                      href={`/issues/${iss.id}`}
                      className="text-gray-800 hover:text-blue-600 line-clamp-2 text-xs leading-relaxed"
                    >
                      {iss.summary}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={l1Color(iss.l1Domain)}>
                      {iss.l1Domain}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {iss.l2ProcessArea}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge className={priorityColor(iss.priority)}>
                      {iss.priority.split("-")[0]}
                    </Badge>
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
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 bg-gray-50 border-t border-gray-200">
          <span>
            {totalFiltered === 0
              ? "No issues in this view."
              : `Showing ${showingFrom}–${showingTo} of ${totalFiltered}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              {currentPage <= 1 ? (
                <span className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium opacity-40">
                  Previous
                </span>
              ) : (
                <Link
                  href={`/issues${buildIssuesQuery(baseParams, { page: String(currentPage - 1) })}`}
                  className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-100"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-500 tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage >= totalPages ? (
                <span className="px-3 py-1.5 rounded-md border border-gray-200 text-sm font-medium opacity-40">
                  Next
                </span>
              ) : (
                <Link
                  href={`/issues${buildIssuesQuery(baseParams, { page: String(currentPage + 1) })}`}
                  className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm font-medium hover:bg-gray-100"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
