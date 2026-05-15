/**
 * E2E: Auth flows — form rendering, error handling, open-redirect protection.
 */
import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("renders login form with correct fields", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill("notareal@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword123");
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page.locator("p").filter({ hasText: /invalid|incorrect|error/i }))
      .toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("open-redirect //evil.com — page stays on login, URL never contains evil.com", async ({ page }) => {
    // Navigate with a malicious redirect parameter
    await page.goto("/auth/login?redirect=//evil.com");
    // The login page must render (not crash)
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // The browser URL must not contain evil.com
    expect(page.url()).not.toContain("evil.com");
  });

  test("open-redirect /\\evil.com — page stays on login", async ({ page }) => {
    await page.goto("/auth/login?redirect=%2F%5Cevil.com");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    expect(page.url()).not.toContain("evil.com");
  });

  test("sign-up link navigates to signup page", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("link", { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });
});

test.describe("Signup page", () => {
  test("renders signup form", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });
});
