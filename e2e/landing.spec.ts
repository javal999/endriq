/**
 * E2E: Public landing page — no auth required.
 */
import { test, expect } from "@playwright/test";

test.describe("Public landing page", () => {
  test("loads with correct headline and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "second opinion",
    );
    await expect(page.getByRole("link", { name: /sample weekly report/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /sign up with strava/i })).toBeVisible();
  });

  test("demo report is accessible without login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sample weekly report/i }).click();
    await expect(page).toHaveURL(/\/report\/demo\//);
    await expect(page.getByRole("heading", { name: /weekly report/i })).toBeVisible();
  });

  test("EN/ID locale toggle buttons are present in nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "EN" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ID" })).toBeVisible();
  });

  test("ID locale toggle is clickable and triggers a network request", async ({ page }) => {
    // Intercept the locale API call to verify it fires
    let localeApiCalled = false;
    await page.route("**/api/locale", () => {
      localeApiCalled = true;
    });

    await page.goto("/");
    await page.getByRole("button", { name: "ID" }).click();
    await page.waitForTimeout(500); // allow the fetch to fire

    expect(localeApiCalled).toBe(true);
  });

  test("unauthenticated visit to /dashboard redirects away", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard/);
  });
});
