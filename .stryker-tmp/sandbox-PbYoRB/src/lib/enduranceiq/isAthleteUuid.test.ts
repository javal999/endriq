// @ts-nocheck
import { describe, expect, it } from "vitest";
import { isAthleteUuid } from "./isAthleteUuid";

describe("isAthleteUuid", () => {
  it("accepts seeded athlete id from seed.sql", () => {
    expect(isAthleteUuid("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")).toBe(true);
  });

  it("rejects non-canonical strings", () => {
    expect(isAthleteUuid("not-a-uuid")).toBe(false);
    expect(isAthleteUuid("aaaaaaaa-bbbb-cccc-dddd")).toBe(false);
  });
});
