// @ts-nocheck
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-5 py-12 md:px-12">
      <div className="h-7 w-48 rounded bg-[var(--surface-raised)]" />
      <div className="mt-6 space-y-4">
        <div className="h-4 w-full rounded bg-[var(--surface-raised)]" />
        <div className="h-4 w-5/6 rounded bg-[var(--surface-raised)]" />
        <div className="h-4 w-4/6 rounded bg-[var(--surface-raised)]" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="h-32 rounded border border-[var(--border)] bg-[var(--surface-raised)]" />
        <div className="h-32 rounded border border-[var(--border)] bg-[var(--surface-raised)]" />
      </div>
    </div>
  );
}
