import { NextRequest, NextResponse } from "next/server";
import { findSimilarByText } from "@/lib/db";
import { classifyL2Async } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, area } = body as { text: string; area?: string };

    if (!text || text.trim().length < 5) {
      return NextResponse.json({ matches: [] });
    }

    const l2 = await classifyL2Async(text);
    const matches = await findSimilarByText(text, l2, area || "", 5);

    const results = matches.map((m) => ({
      id: m.id,
      area: m.area,
      summary: m.summary,
      issue: m.issue,
      l1Domain: m.l1Domain,
      l2ProcessArea: m.l2ProcessArea,
      status: m.status,
      routeTo: m.routeTo,
      followUp: m.followUp,
      progress: m.progress,
    }));

    return NextResponse.json({ matches: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message, matches: [] }, { status: 500 });
  }
}
