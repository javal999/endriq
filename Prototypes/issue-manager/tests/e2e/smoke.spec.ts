import { test, expect } from "@playwright/test";

/**
 * Smoke: critical routes render (PRD Modules I + intake entry points).
 * Why: fast signal that the app shell and data-backed pages are reachable.
 */
test.describe("Smoke", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("issues list loads", async ({ page }) => {
    await page.goto("/issues");
    await expect(page.getByRole("heading", { name: "All Issues" })).toBeVisible();
  });

  test("issue detail loads", async ({ page }) => {
    await page.goto("/issues/ISS-0002");
    await expect(page.locator("main h1.font-mono")).toContainText("ISS-0002");
  });

  test("workflow board shows summary above columns", async ({ page }) => {
    await page.goto("/workflow");
    const summary = page.getByRole("heading", { name: "Workflow Summary" });
    const newCol = page.getByRole("heading", { name: "New" }).first();
    await expect(summary).toBeVisible();
    await expect(newCol).toBeVisible();
    const summaryBox = await summary.boundingBox();
    const newColBox = await newCol.boundingBox();
    expect(summaryBox && newColBox).toBeTruthy();
    if (summaryBox && newColBox) {
      expect(summaryBox.y).toBeLessThan(newColBox.y);
    }
  });

  test("groups page loads", async ({ page }) => {
    await page.goto("/groups");
    await expect(page.getByRole("heading", { name: "Issue Groups" })).toBeVisible();
  });

  test("upload page loads", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: "Upload Excel" })).toBeVisible();
  });

  test("submit page loads", async ({ page }) => {
    await page.goto("/submit");
    await expect(page.getByRole("heading", { name: "Submit Issue" })).toBeVisible();
  });

  test("triage page loads", async ({ page }) => {
    await page.goto("/triage");
    await expect(
      page.getByRole("heading", { name: "Triage & Classification" }),
    ).toBeVisible();
  });

  test("priority queue loads", async ({ page }) => {
    await page.goto("/priority");
    await expect(page.getByRole("heading", { name: "Priority Queue" })).toBeVisible();
  });

  test("patterns page loads", async ({ page }) => {
    await page.goto("/patterns");
    await expect(page.getByRole("heading", { name: "Pattern Analysis" })).toBeVisible();
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
