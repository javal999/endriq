import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED = ["en", "id"] as const;
type Locale = (typeof SUPPORTED)[number];

function isLocale(v: string): v is Locale {
  return (SUPPORTED as readonly string[]).includes(v);
}

/** Resolve locale: cookie → Accept-Language → default "en". DB pref is applied at the API level. */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("eiq_locale")?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  const accept = headerStore.get("accept-language") ?? "";
  // Take only the language tag (ignore region + quality values)
  const primary = accept.split(",")[0]?.split(";")[0]?.split("-")[0]?.trim().toLowerCase() ?? "";
  if (isLocale(primary)) return primary;

  return "en";
}

async function loadMessages(locale: Locale) {
  const [common, landing, report, settings, auth, learn] = await Promise.all([
    import(`./messages/${locale}/common.json`),
    import(`./messages/${locale}/landing.json`),
    import(`./messages/${locale}/report.json`),
    import(`./messages/${locale}/settings.json`),
    import(`./messages/${locale}/auth.json`),
    import(`./messages/${locale}/learn.json`),
  ]);
  return {
    common: common.default,
    landing: landing.default,
    report: report.default,
    settings: settings.default,
    auth: auth.default,
    learn: learn.default,
  };
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = await loadMessages(locale);
  return { locale, messages };
});
