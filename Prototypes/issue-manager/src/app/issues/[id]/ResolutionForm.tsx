"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { STATUSES } from "@/lib/types";

export default function ResolutionForm({
  issueId,
  currentStatus,
}: {
  issueId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [resolution, setResolution] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, string> = {};
    if (status !== currentStatus) body.status = status;
    if (resolution.trim()) body.resolution = resolution.trim();

    if (Object.keys(body).length === 0) {
      setError("No changes to save.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in required to save changes.");
        } else {
          setError(data.error || "Save failed");
        }
      } else {
        setSaved(true);
        setResolution("");
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-500">
        Update Status & Resolution
      </h2>

      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 font-medium mb-1">
          Resolution / Progress Note
        </label>
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          placeholder="Describe what was done, root cause, workaround applied, etc."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          This note becomes part of the knowledge base for future reference.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">Saved</span>
        )}
        {error && (
          <span className="text-sm text-red-600 flex flex-wrap items-center gap-2">
            {error}
            {error.includes("Sign in") && (
              <Link
                href={`/login?returnTo=${encodeURIComponent(`/issues/${issueId}`)}`}
                className="text-blue-600 underline font-medium"
              >
                Sign in
              </Link>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
