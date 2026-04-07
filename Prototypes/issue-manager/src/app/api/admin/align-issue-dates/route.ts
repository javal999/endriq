import { NextRequest, NextResponse } from "next/server";
import { adminAlignCanonicalDates } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * One-off: align `date` + `dedupHash` for IDs in `src/lib/canonical-date-fixes.ts`.
 * Same authentication as POST /api/admin/reset (`ISSUE_MANAGER_ADMIN_SECRET`).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.ISSUE_MANAGER_ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Admin align is not configured. Set ISSUE_MANAGER_ADMIN_SECRET in the deployment environment.",
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

  const result = await adminAlignCanonicalDates();
  return NextResponse.json({
    ok: true,
    ...result,
    note: "Each warm Vercel instance has its own SQLite; run once per instance or rely on Blob after replicaPutIssue. If an ID was skipped as not_found, it may only exist on another instance until merged.",
  });
}
