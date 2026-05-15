"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ?? null,
  );
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      let next = searchParams.get("redirect") ?? "/dashboard";
      if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
        next = "/dashboard";
      }
      router.replace(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-sans text-xl font-bold tracking-tight text-[var(--text-primary)]">
        Log in
      </h1>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
        EnduranceIQ uses your account for reports and integrations.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="block text-[12px] font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-[12px] font-medium text-[var(--text-secondary)]">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[14px] text-[var(--text-primary)]"
          />
        </div>
        {error ? (
          <p className="rounded border border-[var(--border)] bg-[rgba(196,75,63,0.06)] px-3 py-2 text-[13px] text-[var(--status-bad)]">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-11 w-full items-center justify-center rounded bg-[var(--accent)] px-5 font-sans text-[13px] font-medium text-white hover:bg-[#245045] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-[13px] text-[var(--text-muted)]">
        No account?{" "}
        <Link href="/auth/signup" className="text-[var(--accent)] underline underline-offset-2">
          Create one
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-16 md:px-8">
      <Suspense fallback={<p className="text-[13px] text-[var(--text-muted)]">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
