import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPPORTED = ["en", "id"] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (SUPPORTED as readonly string[]).includes(v);
}

/**
 * POST /api/locale
 * Body: { locale: "en" | "id" }
 * Sets the eiq_locale cookie and (if logged in) persists to athletes.preferred_locale.
 */
export async function POST(request: NextRequest) {
  let locale: Locale;
  try {
    const body = (await request.json()) as unknown;
    const l = (body as { locale?: unknown })?.locale;
    if (!isLocale(l)) {
      return NextResponse.json({ ok: false, error: "Invalid locale" }, { status: 400 });
    }
    locale = l;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, locale });

  // Persist cookie — 1 year TTL, httpOnly to avoid XSS, SameSite=Lax
  response.cookies.set("eiq_locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  // Also persist to DB for logged-in users (best-effort, don't fail the request)
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("athletes")
        .update({ preferred_locale: locale })
        .eq("id", user.id);
    }
  } catch {
    // Non-critical — cookie is sufficient for the session
  }

  return response;
}
