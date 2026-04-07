import { NextRequest, NextResponse } from "next/server";
import { acknowledgeGroup } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { l1Domain, l2ProcessArea, action, by } = (await req.json()) as {
      l1Domain: string;
      l2ProcessArea: string;
      action: "acknowledge";
      by?: string;
    };

    if (!l1Domain || !l2ProcessArea) {
      return NextResponse.json({ error: "l1Domain and l2ProcessArea required" }, { status: 400 });
    }

    if (action === "acknowledge") {
      await acknowledgeGroup(l1Domain, l2ProcessArea, by || "Operator");
      return NextResponse.json({ success: true, status: "acknowledged" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
