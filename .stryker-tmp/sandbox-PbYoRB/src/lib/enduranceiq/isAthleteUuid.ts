/** Canonical hex UUID string (PostgreSQL `uuid` text form). Not RFC variant/version strict — seeded ids may use memorable placeholders. */
// @ts-nocheck

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isAthleteUuid(id: string): boolean {
  return UUID_RE.test(id);
}
