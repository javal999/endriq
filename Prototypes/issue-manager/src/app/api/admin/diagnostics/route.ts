import { NextRequest, NextResponse } from "next/server";
import { getIssueSyncDiagnostics } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Read-only snapshot: Blob list vs SQLite on this instance, then one `getAllIssues()` hydration pass.
 * Same auth as `POST /api/admin/reset`: `x-admin-secret` or JSON `{ "secret" }` matching ISSUE_MANAGER_ADMIN_SECRET.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.ISSUE_MANAGER_ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "Admin diagnostics is not configured. Set ISSUE_MANAGER_ADMIN_SECRET in the deployment environment.",
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

  try {
    const diagnostics = await getIssueSyncDiagnostics();
    return NextResponse.json(diagnostics);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Diagnostics failed", detail: message },
      { status: 500 },
    );
  }
}
