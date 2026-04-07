import { test, expect } from "@playwright/test";

/**
 * PRD: Module I (I-02 central view, I-03 P1/P2 emphasis in priority page).
 * Why: operational views must render counts and navigation.
 */
test.describe("Dashboard and priority views", () => {
  test("dashboard shows stat cards and charts", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Total Issues")).toBeVisible();
    await expect(page.getByText("Open Issues")).toBeVisible();
  });

  test("priority queue lists open issues with priority column", async ({ page }) => {
    await page.goto("/priority");
    await expect(page.getByRole("heading", { name: "Priority Queue" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Priority" })).toBeVisible();
  });
});
