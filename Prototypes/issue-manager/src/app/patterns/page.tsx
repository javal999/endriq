import { getAllIssues, detectPatternsFromIssues, topValuesFromIssues } from "@/lib/store";
import { Badge, l1Color } from "@/lib/ui-helpers";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const issues = await getAllIssues();
  const patterns = detectPatternsFromIssues(issues);
  const l2Columns = topValuesFromIssues(issues, "l2ProcessArea", 12);

  const areaIssueCount: Record<string, number> = {};
  for (const iss of issues) {
    areaIssueCount[iss.area] = (areaIssueCount[iss.area] || 0) + 1;
  }
  const hotAreas = Object.entries(areaIssueCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const l2ByL1: Record<string, Record<string, number>> = {};
  for (const iss of issues) {
    if (!l2ByL1[iss.l1Domain]) l2ByL1[iss.l1Domain] = {};
    l2ByL1[iss.l1Domain][iss.l2ProcessArea] =
      (l2ByL1[iss.l1Domain][iss.l2ProcessArea] || 0) + 1;
  }

  const dupCandidates = issues.filter((iss) => {
    const others = issues.filter(
      (o) =>
        o.id !== iss.id &&
        o.area === iss.area &&
        o.l2ProcessArea === iss.l2ProcessArea,
    );
    return others.length >= 3;
  });
  const dupGroups: Record<string, typeof issues> = {};
  for (const iss of dupCandidates) {
    const key = `${iss.area}__${iss.l2ProcessArea}`;
    if (!dupGroups[key]) dupGroups[key] = [];
    if (dupGroups[key].length < 3) dupGroups[key].push(iss);
  }

  const heatmapSection = (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-sm mb-4">
        Issue Taxonomy Heatmap (L1 × L2)
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-500">
                L1 Domain
              </th>
              {l2Columns.map((t) => (
                <th
                  key={t.label}
                  className="p-2 font-medium text-gray-500 text-center"
                >
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(l2ByL1)
              .sort((a, b) => {
                const aSum = Object.values(a[1]).reduce((s, v) => s + v, 0);
                const bSum = Object.values(b[1]).reduce((s, v) => s + v, 0);
                return bSum - aSum;
              })
              .map(([l1, l2s]) => (
                <tr key={l1} className="border-b border-gray-100">
                  <td className="p-2">
                    <Badge className={l1Color(l1)}>{l1}</Badge>
                  </td>
                  {l2Columns.map((t) => {
                    const v = l2s[t.label] || 0;
                    const intensity =
                      v === 0
                        ? ""
                        : v < 5
                          ? "bg-blue-50"
                          : v < 15
                            ? "bg-blue-100"
                            : v < 40
                              ? "bg-blue-200"
                              : v < 80
                                ? "bg-blue-300"
                                : "bg-blue-400 text-white";
                    return (
                      <td
                        key={t.label}
                        className={`p-2 text-center ${intensity}`}
                      >
                        {v > 0 ? v : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pattern Analysis</h1>
        <p className="text-sm text-gray-500 mt-1">
          Recurring issues, systemic patterns, and cluster signals
        </p>
      </div>

      {heatmapSection}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Top Issue Clusters by Process Area
          </h2>
          <div className="space-y-3">
            {patterns.slice(0, 10).map((p) => (
              <div
                key={p.l2}
                className="p-3 rounded-lg border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{p.l2}</span>
                  <span className="text-sm font-bold">{p.count} issues</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>
                    {p.areas.length} DC{p.areas.length > 1 ? "s" : ""} affected
                  </span>
                  {p.isSystemic && (
                    <Badge className="bg-red-100 text-red-700 border-red-200">
                      SYSTEMIC
                    </Badge>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-400 truncate">
                  Sample: {p.sampleIds.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-sm mb-4">
            Hotspot Areas (Most Issues)
          </h2>
          <div className="space-y-2">
            {hotAreas.map(([area, count]) => {
              const pct = Math.round((count / issues.length) * 100);
              return (
                <div key={area} className="flex items-center gap-3">
                  <span className="w-28 text-sm text-right text-gray-600 truncate">
                    {area}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className="h-full bg-teal-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {count} ({pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm mb-4">
          Potential Duplicate Clusters (same area + same L2)
        </h2>
        <div className="space-y-3">
          {Object.entries(dupGroups)
            .slice(0, 10)
            .map(([key, iss]) => {
              const [area, l2] = key.split("__");
              return (
                <div
                  key={key}
                  className="p-3 rounded-lg border border-orange-100 bg-orange-50"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{area}</span>
                    <span className="text-xs text-gray-500">{l2}</span>
                    <Badge className="bg-orange-200 text-orange-800 border-orange-300">
                      Potential duplicates
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {iss.map((i) => (
                      <Link
                        key={i.id}
                        href={`/issues/${i.id}`}
                        className="block text-xs text-gray-600 hover:text-blue-600"
                      >
                        <span className="font-mono text-blue-600">{i.id}</span>{" "}
                        {i.summary}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
