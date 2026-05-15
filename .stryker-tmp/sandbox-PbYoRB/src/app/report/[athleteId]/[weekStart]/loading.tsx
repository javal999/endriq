// @ts-nocheck
export default function ReportLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-5 pb-16 pt-10 md:px-12 md:pt-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="h-6 w-36 rounded bg-[var(--surface-raised)]" />
          <div className="mt-2 h-4 w-48 rounded bg-[var(--surface-raised)]" />
        </div>
        <div className="flex gap-4">
          <div className="h-4 w-28 rounded bg-[var(--surface-raised)]" />
          <div className="h-4 w-24 rounded bg-[var(--surface-raised)]" />
        </div>
      </div>

      {/* Stat row */}
      <div className="mb-10 grid grid-cols-2 gap-6 border-b border-[var(--border)] pb-10 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-8 w-24 rounded bg-[var(--surface-raised)]" />
            <div className="mt-2 h-3 w-16 rounded bg-[var(--surface-raised)]" />
            <div className="mt-1 h-3 w-32 rounded bg-[var(--surface-raised)]" />
          </div>
        ))}
      </div>

      {/* This week card */}
      <div className="mb-10">
        <div className="mb-4 h-4 w-24 rounded bg-[var(--surface-raised)]" />
        <div className="rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)] p-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-20 rounded bg-[var(--surface-raised)]" />
                <div className="h-4 w-full rounded bg-[var(--surface-raised)]" />
                <div className="h-4 w-5/6 rounded bg-[var(--surface-raised)]" />
                <div className="h-4 w-4/6 rounded bg-[var(--surface-raised)]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intensity bars */}
      <div className="mb-10">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-[var(--surface-raised)]" />
          <div className="h-6 w-28 rounded bg-[var(--surface-raised)]" />
        </div>
        <div className="rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)] p-8 space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-20 shrink-0">
                <div className="h-3 w-full rounded bg-[var(--surface-raised)]" />
              </div>
              <div className="h-3 flex-1 rounded-full bg-[var(--surface-raised)]" />
              <div className="h-3 w-8 rounded bg-[var(--surface-raised)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Sessions table */}
      <div>
        <div className="mb-4 h-4 w-20 rounded bg-[var(--surface-raised)]" />
        <div className="rounded-[20px] border border-[rgba(213,216,224,0.45)] bg-[rgba(250,251,253,0.68)]">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 border-b border-[rgba(213,216,224,0.3)] px-6 py-4 last:border-0"
            >
              <div className="h-3 w-14 rounded bg-[var(--surface-raised)]" />
              <div className="h-3 w-20 rounded bg-[var(--surface-raised)]" />
              <div className="h-3 w-16 rounded bg-[var(--surface-raised)]" />
              <div className="h-3 w-16 rounded bg-[var(--surface-raised)]" />
              <div className="ml-auto h-6 w-16 rounded bg-[var(--surface-raised)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
