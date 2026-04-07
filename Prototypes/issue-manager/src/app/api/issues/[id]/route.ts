import { NextRequest, NextResponse } from "next/server";
import { getIssue, updateIssue } from "@/lib/db";
import {
  L1_DOMAINS,
  L2_AREAS,
  PRIORITIES,
  ROUTES,
  STATUSES,
} from "@/lib/types";

const MAX_RESOLUTION_LEN = 10_000;

const ALLOWED_STATUS = new Set<string>(STATUSES as unknown as string[]);
const ALLOWED_L1 = new Set<string>(L1_DOMAINS as unknown as string[]);
const ALLOWED_L2 = new Set<string>(L2_AREAS as unknown as string[]);
const ALLOWED_PRIORITY = new Set<string>(PRIORITIES as unknown as string[]);
const ALLOWED_ROUTE = new Set<string>(ROUTES as unknown as string[]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const existing = await getIssue(id);
    if (!existing) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, string> = {};

    if (body.status !== undefined && body.status !== "") {
      if (!ALLOWED_STATUS.has(body.status)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.resolution !== undefined && body.resolution !== "") {
      const text = String(body.resolution).trim();
      if (!text) {
        /* skip empty resolution */
      } else if (text.length > MAX_RESOLUTION_LEN) {
        return NextResponse.json(
          { error: `Resolution text too long (max ${MAX_RESOLUTION_LEN} characters)` },
          { status: 400 },
        );
      } else {
        const timestamp = new Date().toISOString().split("T")[0];
        const entry = `[${timestamp}] ${text}`;
        updates.progress = existing.progress ? `${existing.progress}\n${entry}` : entry;
      }
    }

    if (body.l1Domain !== undefined && body.l1Domain !== "") {
      if (!ALLOWED_L1.has(body.l1Domain)) {
        return NextResponse.json({ error: "Invalid l1Domain value" }, { status: 400 });
      }
      updates.l1Domain = body.l1Domain;
    }
    if (body.l2ProcessArea !== undefined && body.l2ProcessArea !== "") {
      if (!ALLOWED_L2.has(body.l2ProcessArea)) {
        return NextResponse.json(
          { error: "Invalid l2ProcessArea value" },
          { status: 400 },
        );
      }
      updates.l2ProcessArea = body.l2ProcessArea;
    }
    if (body.priority !== undefined && body.priority !== "") {
      if (!ALLOWED_PRIORITY.has(body.priority)) {
        return NextResponse.json({ error: "Invalid priority value" }, { status: 400 });
      }
      updates.priority = body.priority;
    }
    if (body.routeTo !== undefined && body.routeTo !== "") {
      if (!ALLOWED_ROUTE.has(body.routeTo)) {
        return NextResponse.json({ error: "Invalid routeTo value" }, { status: 400 });
      }
      updates.routeTo = body.routeTo;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const updated = await updateIssue(id, updates);
    return NextResponse.json({ success: true, issue: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
