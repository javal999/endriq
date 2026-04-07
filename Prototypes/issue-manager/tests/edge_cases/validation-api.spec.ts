import { test, expect } from "@playwright/test";

/**
 * PRD: AC-1.x validation, B-02 dropdown enforcement (API layer), QA §20.1 constraints.
 * Why: bad payloads must not corrupt the issue register.
 */
test.describe("API validation and boundaries", () => {
  test("POST /api/issues rejects issue text under 3 characters", async ({
    request,
  }) => {
    const res = await request.post("/api/issues", {
      data: {
        area: "SURABAYA",
        divisi: "Administrator",
        role: "Admin",
        issue: "ab",
      },
    });
    expect(res.status()).toBe(400);
    const j = await res.json();
    expect(String(j.error || "")).toMatch(/min 3|required/i);
  });

  test("POST /api/issues rejects missing area", async ({ request }) => {
    const res = await request.post("/api/issues", {
      data: {
        area: "",
        divisi: "Administrator",
        role: "Admin",
        issue: "Valid length issue text here",
      },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/issues returns 409 when duplicate fingerprint matches", async ({
    request,
  }) => {
    const issue = `Duplicate fingerprint E2E ${Date.now()} billing error`;
    const body = {
      area: "SURABAYA",
      divisi: "Administrator",
      role: "Admin",
      issue,
    };
    const first = await request.post("/api/issues", { data: body });
    expect(first.status()).toBe(200);
    const second = await request.post("/api/issues", { data: body });
    expect(second.status()).toBe(409);
  });

  test("PATCH /api/issues/[id] rejects invalid status", async ({ request }) => {
    const res = await request.patch("/api/issues/ISS-0002", {
      data: { status: "NotARealStatus" },
    });
    expect(res.status()).toBe(400);
  });

  test("issues list empty state for impossible search query", async ({ page }) => {
    await page.goto("/issues?q=__IMPOSSIBLE_MATCH_ZZZ_E2E__");
    await expect(page.getByText("No issues in this view.")).toBeVisible();
  });
});
