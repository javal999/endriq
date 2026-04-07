import { NextRequest, NextResponse } from "next/server";
import { enrichRowAsync } from "@/lib/ai";
import { insertIssue, computeDedupHash, issueExistsByHash } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { area, divisi, role, issue, klasifikasi, urgency } = body as {
      area: string;
      divisi: string;
      role: string;
      issue: string;
      klasifikasi?: string;
      urgency?: string;
    };

    if (!issue || issue.trim().length < 3) {
      return NextResponse.json({ error: "Issue description is required (min 3 characters)" }, { status: 400 });
    }
    if (!area) {
      return NextResponse.json({ error: "Area/DC is required" }, { status: 400 });
    }

    const enriched = await enrichRowAsync({
      area,
      divisi,
      role,
      issue,
      klasifikasi: klasifikasi || "",
      urgency: urgency || "",
    });

    // Allow caller to override AI suggestions
    if (body.l1Domain) enriched.l1Domain = body.l1Domain;
    if (body.l2ProcessArea) enriched.l2ProcessArea = body.l2ProcessArea;
    if (body.priority) enriched.priority = body.priority;
    if (body.routeTo) enriched.routeTo = body.routeTo;

    const dedupHash = computeDedupHash(enriched.area, enriched.date, enriched.divisi, enriched.role, enriched.issue);

    if (await issueExistsByHash(dedupHash)) {
      return NextResponse.json({ error: "A matching issue already exists" }, { status: 409 });
    }

    const inserted = await insertIssue({ ...enriched, dedupHash, source: "manual" });

    return NextResponse.json({ success: true, issue: inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
