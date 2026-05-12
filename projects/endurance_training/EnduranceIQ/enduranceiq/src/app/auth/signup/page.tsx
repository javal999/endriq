"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      const user = data.user;
      if (!user?.id) {
        setError("Check your email to confirm your account, then log in.");
        return;
      }

      const { error: insErr } = await supabase.from("athletes").insert({
        id: user.id,
        email: user.email ?? email.trim(),
        name: null,
      });

      if (insErr) {
        setError(insErr.message);
        return;
      }

      router.replace("/onboarding");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 md:px-8">
      <h1 className="font-sans text-xl font-bold tracking-tight text-[var(--text-primary)]">
        Create account
      </h1>
      <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
        Your athlete profile uses the same id as your login (required for training data access).
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
            autoComplete="new-password"
            required
            minLength={8}
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
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-[13px] text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[var(--accent)] underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
