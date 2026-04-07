import { test, expect } from "@playwright/test";

/**
 * PRD: Module I reporting (I-01 area filter), issue master B-01 read path,
 * G-01 status values on detail (ResolutionForm).
 * Why: list filters and detail must reflect the same underlying records.
 */
test.describe("Issues list, filters, and detail", () => {
  test("issues list supports area filter via query string", async ({ page }) => {
    await page.goto("/issues?area=SURABAYA");
    await expect(page.getByRole("heading", { name: "All Issues" })).toBeVisible();
    const rows = page.locator('a[href^="/issues/ISS-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(count, 5); i++) {
      await expect(rows.nth(i)).toBeVisible();
    }
    await expect(page.locator("main")).toContainText("SURABAYA");
  });

  test("issue detail shows resolution controls", async ({ page }) => {
    await page.goto("/issues/ISS-0002");
    await expect(page.locator("main h1.font-mono")).toContainText("ISS-0002");
    await expect(
      page.getByRole("heading", { name: "Update Status & Resolution" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
  });
});
