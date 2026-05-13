"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LocaleSwitch({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function switchTo(locale: string) {
    if (locale === currentLocale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="flex items-center rounded border border-[var(--border)] bg-[var(--surface)] text-[12px] font-sans font-medium"
      aria-label={t("locale.switchTo")}
    >
      {(["en", "id"] as const).map((loc) => (
        <button
          key={loc}
          onClick={() => void switchTo(loc)}
          disabled={isPending}
          aria-pressed={currentLocale === loc}
          className={`min-w-[32px] px-2 py-1 transition-colors ${
            currentLocale === loc
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          } ${loc === "en" ? "rounded-l" : "rounded-r"}`}
        >
          {t(`locale.${loc}`)}
        </button>
      ))}
    </div>
  );
}
