import { getAllIssues } from "@/lib/store";
import Link from "next/link";
import TriageIssueCard from "./TriageIssueCard";

export const dynamic = "force-dynamic";

export default async function TriagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const filterStatus = params.status || "New";

  const allIssues = await getAllIssues();
  const issues = allIssues.filter((i) => i.status === filterStatus);

  const counts = {
    New: allIssues.filter((i) => i.status === "New").length,
    Triaged: allIssues.filter((i) => i.status === "Triaged").length,
    Assigned: allIssues.filter((i) => i.status === "Assigned").length,
  };

  return (
    <div className="p-6 max-w-7xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Triage &amp; Classification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review, classify, and route issues. Overrides persist when you click
          Accept &amp; Route. New → Triaged → Assigned advances the status.
        </p>
      </div>

      <div className="flex gap-2">
        {(["New", "Triaged", "Assigned"] as const).map((s) => (
          <Link
            key={s}
            href={`/triage?status=${s}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              filterStatus === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {s}{" "}
            <span className="opacity-70">
              ({counts[s as keyof typeof counts]})
            </span>
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {issues.slice(0, 50).map((iss) => (
          <TriageIssueCard
            key={iss.id}
            id={iss.id}
            area={iss.area}
            date={iss.date}
            issue={iss.issue}
            l1Domain={iss.l1Domain}
            l2ProcessArea={iss.l2ProcessArea}
            priority={iss.priority}
            routeTo={iss.routeTo}
            status={iss.status}
          />
        ))}
      </div>

      {issues.length > 50 && (
        <p className="text-sm text-gray-500">
          Showing 50 of {issues.length} issues in this status.
        </p>
      )}
      {issues.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No issues with status &quot;{filterStatus}&quot;
        </div>
      )}
    </div>
  );
}
