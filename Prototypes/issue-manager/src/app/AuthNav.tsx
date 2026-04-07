"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthNav() {
  const router = useRouter();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status");
        const data = await res.json();
        if (!cancelled) {
          setAuthEnabled(Boolean(data.authEnabled));
          setSignedIn(Boolean(data.signedIn));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedIn(false);
    router.refresh();
  }

  if (!authEnabled) {
    return (
      <div className="text-xs text-gray-500 px-3 py-2">
        Auth off <span className="text-gray-600">(set ISSUE_MANAGER_PASSWORD)</span>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="px-3 py-2 space-y-1">
        <p className="text-xs text-green-400/90">Signed in</p>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-xs text-gray-300 hover:text-white underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-2">
      <Link
        href="/login"
        className="text-xs font-medium text-amber-300 hover:text-amber-200"
      >
        Sign in to edit
      </Link>
    </div>
  );
}
