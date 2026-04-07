import { NextResponse } from "next/server";
import { getGroupSummaries } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const groups = await getGroupSummaries();
    return NextResponse.json({ groups });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message, groups: [] }, { status: 500 });
  }
}
