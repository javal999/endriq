import { NextRequest, NextResponse } from "next/server";
import { adminDeleteAllIssuesAndGroups } from "@/lib/db";
import { deleteAllReplicaBlobs } from "@/lib/issue-blob-sync";

export const dynamic = "force-dynamic";

/**
 * Wipe all issues and group rows in SQLite (this instance) and delete all Vercel Blob replicas
 * under issue-manager-sync/. Requires ISSUE_MANAGER_ADMIN_SECRET.
 *
 * Call with header: x-admin-secret: <secret>
 * Or JSON body: { "secret": "<secret>" }
 *
 * Before production wipe: set DISABLE_ISSUE_JSON_SEED=1 so a cold start after empty DB does not re-seed bundled JSON.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.ISSUE_MANAGER_ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Admin reset is not configured. Set ISSUE_MANAGER_ADMIN_SECRET in the deployment environment.",
      },
      { status: 503 },
    );
  }

  let provided = req.headers.get("x-admin-secret")?.trim() ?? "";
  if (!provided) {
    try {
      const body = (await req.json()) as { secret?: string };
      provided = String(body?.secret ?? "").trim();
    } catch {
      /* ignore */
    }
  }

  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const blobsRemoved = await deleteAllReplicaBlobs();
  const { issuesRemoved, groupsRemoved } = adminDeleteAllIssuesAndGroups();

  return NextResponse.json({
    ok: true,
    blobsRemoved,
    issuesRemoved,
    groupsRemoved,
    hint:
      "Upload Excel via /upload. Keep DISABLE_ISSUE_JSON_SEED=1 until import completes if you must avoid JSON seed on cold start. Leave CANONICAL_DATES_FROM_BUNDLE unset or 0 in production so Excel dates are not overwritten by the bundle.",
  });
}
