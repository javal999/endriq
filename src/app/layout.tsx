import type { Metadata } from "next";
import {
  Instrument_Serif,
  Inter_Tight,
  JetBrains_Mono,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Nav } from "@/components/nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

export const metadata: Metadata = {
  title: "EnduranceIQ — Weekly training analysis",
  description:
    "Intensity distribution and training load from your watch export — evidence-backed, not medical advice.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  // T04 mobile pass: BottomNav only renders for signed-in users — the
  // four mobile tabs (Today / Plan / Race / Profile) are post-auth surfaces.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang={locale}
      className={`${interTight.variable} ${jetbrains.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <a className="skip-link text-sm text-[var(--accent)]" href="#main-content">
            Skip to content
          </a>
          <Nav />
          <main
            id="main-content"
            className={user ? "flex-1 pb-20 md:pb-0" : "flex-1"}
          >
            {children}
          </main>
          <SiteFooter />
          {user && <BottomNav />}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
