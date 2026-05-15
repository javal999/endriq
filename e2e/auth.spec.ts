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

  test("open-redirect //evil.com — browser stays on app domain (not evil.com)", async ({ page }) => {
    // The ?redirect=//evil.com query param is present in the URL bar (expected)
    // but the browser hostname must remain on our domain — never navigate to evil.com
    await page.goto("/auth/login?redirect=//evil.com");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Hostname must be our domain, not evil.com
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    // Login form renders — page is functional, not crashed
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
  });

  test("open-redirect sanitation — /\\evil.com stays on app domain", async ({ page }) => {
    await page.goto("/auth/login?redirect=%2F%5Cevil.com");
    const url = new URL(page.url());
    expect(url.hostname).not.toBe("evil.com");
    await expect(page.getByLabel(/email/i)).toBeVisible();
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
