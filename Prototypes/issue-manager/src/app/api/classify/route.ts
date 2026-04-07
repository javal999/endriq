import { NextRequest, NextResponse } from "next/server";
import {
  classifyL1Async,
  classifyL2Async,
  deriveRoute,
  derivePriority,
  summarize,
} from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { text, klasifikasi, urgency } = (await req.json()) as {
      text: string;
      klasifikasi?: string;
      urgency?: string;
    };

    if (!text || text.trim().length < 3) {
      return NextResponse.json({ error: "Text too short" }, { status: 400 });
    }

    const l2 = await classifyL2Async(text);
    const l1 = await classifyL1Async(klasifikasi || "", l2, text);
    const route = deriveRoute(l1);
    const priority = derivePriority(l2, text, urgency || "");
    const sum = summarize(text);

    return NextResponse.json({ l1Domain: l1, l2ProcessArea: l2, routeTo: route, priority, summary: sum });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
