"use client";

/**
 * <RaceListEditor> — Settings → Races CRUD UI (F14.0).
 *
 * Server component renders the page shell and seeds initial data; this
 * client component handles all mutations via /api/race and router.refresh().
 *
 * UX rules from PRD §5.7 F14.0:
 *   - List ordered chronologically by race_date.
 *   - Primary race carries a "Primary" pill in accent color.
 *   - "Make primary" toggles atomically; toast confirms.
 *   - Deleting the primary while other races exist prompts to pick a new
 *     primary; deleting the only race confirms the countdown will vanish.
 *
 * Refs: PHASE-2.0-PRD-FINAL.md §5.7; PHASE-2.0-UI-DESIGN.md §3.3.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export interface RaceRow {
  id: string;
  name: string;
  race_type: RaceTypeValue;
  race_date: string;
  is_primary: boolean;
  created_at: string;
}

export type RaceTypeValue =
  | "marathon"
  | "half_marathon"
  | "10k"
  | "5k"
  | "ultramarathon"
  | "ironman_70_3"
  | "ironman_full"
  | "other_endurance";

const RACE_TYPE_LABELS: Record<RaceTypeValue, string> = {
  marathon: "Marathon",
  half_marathon: "Half marathon",
  "10k": "10K",
  "5k": "5K",
  ultramarathon: "Ultramarathon",
  ironman_70_3: "Ironman 70.3",
  ironman_full: "Ironman (full)",
  other_endurance: "Other endurance",
};

const RACE_TYPE_OPTIONS: ReadonlyArray<RaceTypeValue> = [
  "marathon",
  "half_marathon",
  "10k",
  "5k",
  "ultramarathon",
  "ironman_70_3",
  "ironman_full",
  "other_endurance",
];

type FormState = {
  id?: string; // present when editing
  name: string;
  race_type: RaceTypeValue;
  race_date: string;
  is_primary: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  race_type: "marathon",
  race_date: "",
  is_primary: false,
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function sortRaces(rows: RaceRow[]): RaceRow[] {
  return [...rows].sort((a, b) => {
    // Primary always pinned to top.
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.race_date.localeCompare(b.race_date);
  });
}

export function RaceListEditor({ initialRaces }: { initialRaces: RaceRow[] }) {
  const router = useRouter();
  const [races, setRaces] = useState<RaceRow[]>(() => sortRaces(initialRaces));
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openAdd() {
    setForm({ ...EMPTY_FORM, is_primary: races.length === 0 });
    setError(null);
    setFormOpen(true);
  }

  function openEdit(r: RaceRow) {
    setForm({
      id: r.id,
      name: r.name,
      race_type: r.race_type,
      race_date: r.race_date,
      is_primary: r.is_primary,
    });
    setError(null);
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Give the race a name.");
      return;
    }
    if (!form.race_date) {
      setError("Pick a race date.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      race_type: form.race_type,
      race_date: form.race_date,
      is_primary: form.is_primary,
    };

    let res: Response;
    if (form.id) {
      payload.id = form.id;
      res = await fetch("/api/race", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/race", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Save failed. Try again.");
      return;
    }
    const j = (await res.json()) as { ok: true; race: RaceRow };

    setRaces((prev) => {
      const without = prev.filter((r) => r.id !== j.race.id);
      // If the saved row is now primary, demote any others client-side too.
      const next = j.race.is_primary
        ? without.map((r) => ({ ...r, is_primary: false }))
        : without;
      return sortRaces([...next, j.race]);
    });
    setFormOpen(false);
    setForm(EMPTY_FORM);
    startTransition(() => router.refresh());
  }

  async function makePrimary(id: string) {
    const res = await fetch("/api/race", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, is_primary: true }),
    });
    if (!res.ok) return;
    setRaces((prev) =>
      sortRaces(prev.map((r) => ({ ...r, is_primary: r.id === id }))),
    );
    startTransition(() => router.refresh());
  }

  async function deleteRace(id: string) {
    const target = races.find((r) => r.id === id);
    if (!target) return;

    const others = races.filter((r) => r.id !== id);

    if (target.is_primary && others.length > 0) {
      const msg = "Pick a new primary race first — delete a non-primary race or use 'Make primary' on another.";
      window.alert(msg);
      return;
    }

    const confirmMsg = target.is_primary && others.length === 0
      ? "Removing this race will hide the countdown and finish prediction. Continue?"
      : "Delete this race?";
    if (!window.confirm(confirmMsg)) return;

    const res = await fetch(`/api/race?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setRaces((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      {races.length === 0 ? (
        <div className="rounded-md border border-[var(--border-hairline)] bg-[var(--surface)] p-6 text-center">
          <p className="font-sans text-[14px] text-[var(--text-secondary)]">
            No races yet. Add one to unlock the countdown and predicted finish.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-hairline)] rounded-md border border-[var(--border-hairline)] bg-[var(--surface)]">
          {races.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-sans text-[15px] font-medium text-[var(--text-primary)]">
                    {r.name}
                  </span>
                  {r.is_primary && (
                    <span
                      className="rounded-sm bg-[var(--accent-soft)] px-2 py-0.5 font-sans text-[11px] font-medium uppercase tracking-wider text-[var(--accent-dark)]"
                      aria-label="Primary race"
                    >
                      Primary
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 font-sans text-[13px] text-[var(--text-secondary)]">
                  <span>{RACE_TYPE_LABELS[r.race_type]}</span>
                  <span>·</span>
                  <span className="font-mono">{r.race_date}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!r.is_primary && (
                  <button
                    type="button"
                    onClick={() => makePrimary(r.id)}
                    disabled={pending}
                    className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  disabled={pending}
                  className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteRace(r.id)}
                  disabled={pending}
                  className="rounded-sm border border-[var(--border)] bg-transparent px-2.5 py-1 font-sans text-[12px] text-[var(--status-bad)] hover:border-[var(--status-bad)]"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!formOpen && (
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 font-sans text-[14px] font-medium text-[var(--text-on-accent)] hover:opacity-90"
        >
          + Add race
        </button>
      )}

      {formOpen && (
        <form
          onSubmit={submitForm}
          className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <h3 className="font-sans text-[15px] font-semibold">
            {form.id ? "Edit race" : "Add race"}
          </h3>

          <label className="block">
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              Name
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={200}
              placeholder="Jakarta Marathon 2026"
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              required
            />
          </label>

          <label className="block">
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              Race type
            </span>
            <select
              value={form.race_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, race_type: e.target.value as RaceTypeValue }))
              }
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 font-sans text-[14px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              {RACE_TYPE_OPTIONS.map((rt) => (
                <option key={rt} value={rt}>
                  {RACE_TYPE_LABELS[rt]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              Race date
            </span>
            <input
              type="date"
              value={form.race_date}
              min={todayIso()}
              onChange={(e) => setForm((f) => ({ ...f, race_date: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--canvas)] px-3 py-2 font-mono text-[14px] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              required
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_primary}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_primary: e.target.checked }))
              }
            />
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              Make this my primary race (anchors countdown + predictions)
            </span>
          </label>

          {error && (
            <p className="font-sans text-[13px] text-[var(--status-bad)]">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-[var(--accent)] px-4 py-2 font-sans text-[14px] font-medium text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
            >
              {form.id ? "Save changes" : "Add race"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setError(null);
              }}
              className="rounded-md border border-[var(--border)] bg-transparent px-4 py-2 font-sans text-[14px] text-[var(--text-primary)]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
