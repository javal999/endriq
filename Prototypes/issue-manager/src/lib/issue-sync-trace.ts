const TAG = "[issue-manager:sync]";

/** Set `ISSUE_MANAGER_TRACE_LOG=1` on Vercel (or locally) to emit JSON lines in runtime logs. */
export function issueSyncTrace(
  event: string,
  data: Record<string, unknown> = {},
): void {
  if (process.env.ISSUE_MANAGER_TRACE_LOG !== "1") return;
  console.info(
    TAG,
    JSON.stringify({
      event,
      ...data,
      ts: new Date().toISOString(),
    }),
  );
}
