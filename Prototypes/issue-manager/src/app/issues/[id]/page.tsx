import { getIssue, findSimilar } from "@/lib/db";
import {
  Badge,
  priorityColor,
  statusColor,
  l1Color,
  daysSince,
  checkSlaBreach,
  slaTargetLabel,
} from "@/lib/ui-helpers";
import Link from "next/link";
import { notFound } from "next/navigation";
import ResolutionForm from "./ResolutionForm";

export const dynamic = "force-dynamic";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 font-medium uppercase tracking-wider">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssue(id);
  if (!issue) notFound();

  const similar = await findSimilar(issue, 5, false);
  const solvedCases = await findSimilar(issue, 5, true);
  const age = daysSince(issue.date);
  const isStale =
    ["Assigned", "In Progress"].includes(issue.status) && age > 14;
  const isSlaBreach = checkSlaBreach(issue.priority, age);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold font-mono">{issue.id}</h1>
            <Badge className={priorityColor(issue.priority)}>
              {issue.priority}
            </Badge>
            <Badge className={statusColor(issue.status)}>{issue.status}</Badge>
            {isStale && (
              <Badge className="bg-yellow-200 text-yellow-900 border-yellow-300">
                STALE
              </Badge>
            )}
            {isSlaBreach && (
              <Badge className="bg-red-200 text-red-900 border-red-300">
                SLA BREACH
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {issue.area} · {issue.divisi} · {issue.role} · {issue.date} ({age}d
            ago)
          </p>
        </div>
        <Link
          href="/issues"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              AI Summary
            </h2>
            <p className="text-sm leading-relaxed font-medium text-gray-800">
              {issue.summary}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">
              Full Issue Description
            </h2>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
              {issue.issue}
            </p>
          </div>

          {(issue.followUp || issue.progress) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-500">
                Activity Log
              </h2>
              {issue.followUp && (
                <div className="border-l-2 border-blue-300 pl-3">
                  <p className="text-xs text-gray-500 font-medium">
                    HRBP Follow-up
                  </p>
                  <p className="text-sm text-gray-700">{issue.followUp}</p>
                </div>
              )}
              {issue.progress && (
                <div className="border-l-2 border-green-300 pl-3">
                  <p className="text-xs text-gray-500 font-medium">
                    Progress Update
                  </p>
                  <p className="text-sm text-gray-700">{issue.progress}</p>
                </div>
              )}
            </div>
          )}

          <ResolutionForm issueId={issue.id} currentStatus={issue.status} />

          {solvedCases.length > 0 && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-5">
              <h2 className="text-sm font-semibold text-green-700 mb-3">
                Previously Solved Cases
              </h2>
              <div className="space-y-2">
                {solvedCases.map((s) => (
                  <Link
                    key={s.id}
                    href={`/issues/${s.id}`}
                    className="block p-3 rounded-lg border border-green-100 bg-white hover:bg-green-50/50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-600">
                        {s.id}
                      </span>
                      <Badge className={statusColor(s.status)}>
                        {s.status}
                      </Badge>
                      <span className="text-xs text-gray-400">{s.area}</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium mb-1">
                      {s.summary}
                    </p>
                    {(s.followUp || s.progress) && (
                      <p className="text-xs text-green-700">
                        {s.progress || s.followUp}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {similar.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">
                Similar / Related Issues
              </h2>
              <div className="space-y-2">
                {similar.map((s) => (
                  <Link
                    key={s.id}
                    href={`/issues/${s.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-blue-600">
                        {s.id}
                      </span>
                      <Badge className={statusColor(s.status)}>
                        {s.status}
                      </Badge>
                      <span className="text-xs text-gray-400">{s.area}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      {s.summary}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500">
              Classification
            </h2>
            <dl className="space-y-3">
              <Field label="Domain (L1)">
                <Badge className={l1Color(issue.l1Domain)}>
                  {issue.l1Domain}
                </Badge>
              </Field>
              <Field label="Process Area (L2)">
                <span className="text-sm font-medium">
                  {issue.l2ProcessArea}
                </span>
              </Field>
              <Field label="Old Classification">
                <span className="text-xs text-gray-400">
                  {issue.klassifikasiLama || "—"}
                </span>
              </Field>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500">
              Routing & Ownership
            </h2>
            <dl className="space-y-3">
              <Field label="Route To">
                <span className="text-sm font-medium">{issue.routeTo}</span>
              </Field>
              <Field label="Hyper Care Ticket">
                <span className="text-sm">
                  {issue.ticketHc ? (
                    <span className="text-green-700 font-mono">
                      #{issue.ticketHc}
                    </span>
                  ) : (
                    <span className="text-gray-400">Not linked</span>
                  )}
                </span>
              </Field>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500">
              Reporter Info
            </h2>
            <dl className="space-y-3">
              <Field label="Area / DC">
                <span className="text-sm">{issue.area}</span>
              </Field>
              <Field label="Division">
                <span className="text-sm">
                  {issue.divisi}
                  {issue.divpiRaw !== issue.divisi && (
                    <span className="text-gray-400 text-xs ml-1">
                      (raw: {issue.divpiRaw})
                    </span>
                  )}
                </span>
              </Field>
              <Field label="Role">
                <span className="text-sm">
                  {issue.role}
                  {issue.roleRaw !== issue.role && (
                    <span className="text-gray-400 text-xs ml-1">
                      (raw: {issue.roleRaw})
                    </span>
                  )}
                </span>
              </Field>
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-500">
              SLA Status
            </h2>
            <dl className="space-y-3">
              <Field label="Age">{age} days</Field>
              <Field label="SLA Target">
                {slaTargetLabel(issue.priority)}
              </Field>
              <Field label="SLA Status">
                {isSlaBreach ? (
                  <span className="text-red-600 font-semibold text-sm">
                    BREACHED
                  </span>
                ) : (
                  <span className="text-green-600 text-sm">Within SLA</span>
                )}
              </Field>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
