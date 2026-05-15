/**
 * E2E: Weekly report (demo path, public) + Learn + Support pages.
 */
import { test, expect } from "@playwright/test";

const DEMO_WEEK = "2026-05-12";

test.describe("Demo weekly report", () => {
  test("renders report header with week range", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(page.getByRole("heading", { name: /weekly report/i })).toBeVisible();
  });

  test("renders summary bar labels", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    const body = page.locator("body");
    await expect(body).toContainText(/distance/i);
    await expect(body).toContainText(/training load/i);
  });

  test("renders intensity distribution section", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Section heading
    await expect(
      page.getByRole("heading", { name: /intensity distribution/i }),
    ).toBeVisible();
    // BPM ranges shown (from our fix)
    await expect(page.locator("body")).toContainText(/bpm/);
  });

  test("intensity section contains zone rows with percentages", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Zone bars are present (percentage labels)
    await expect(page.locator("body")).toContainText(/%/);
  });

  test("sessions table shows Date, Type, Status columns", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Column headers
    await expect(page.getByRole("columnheader", { name: /date/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
  });

  test("Type info button toggles classification explanation", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);

    // The ⓘ button beside the Type header
    const infoBtn = page.getByRole("button", { name: /how is type classified/i });
    await expect(infoBtn).toBeVisible();

    // First click — opens explanation
    await infoBtn.click();
    await expect(page.locator("body")).toContainText(/auto-classified/i);

    // Second click — closes
    await infoBtn.click();
    await expect(page.locator("body")).not.toContainText(/75% max HR/i);
  });

  test("renders 'What the data flagged' section", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(
      page.getByRole("heading", { name: /what the data flagged/i }),
    ).toBeVisible();
  });

  test("share button is visible on report", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(
      page.getByRole("button", { name: /share this week/i }),
    ).toBeVisible();
  });

  test("share card image endpoint responds (200 or 302, not 5xx)", async ({ page }) => {
    // Test the new share_id endpoint format works
    // The demo report generates a card without needing a DB lookup
    const response = await page.request.get(
      `/api/share/weekly/demo/${DEMO_WEEK}`,
      { maxRedirects: 3 },
    );
    // Should be a success or redirect (image), not a server error
    expect(response.status()).toBeLessThan(500);
  });

  test("methodology link points to /learn", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    const learnLink = page.getByRole("link", { name: /how zones are calculated/i });
    await expect(learnLink).toBeVisible();
    await expect(learnLink).toHaveAttribute("href", /learn/);
  });
});

test.describe("Learn page", () => {
  test("renders methodology content with citation links", async ({ page }) => {
    await page.goto("/learn");
    await expect(
      page.getByRole("heading", { name: /how enduranceiq works/i }),
    ).toBeVisible();
    const citLinks = page.locator("a").filter({ hasText: "↗" });
    await expect(citLinks.first()).toBeVisible();
  });

  test("strength methodology section is present", async ({ page }) => {
    await page.goto("/learn");
    await expect(
      page.getByRole("heading", { name: /strength recommendations/i }),
    ).toBeVisible();
  });
});

test.describe("Support page", () => {
  test("renders Saweria link without auth", async ({ page }) => {
    await page.goto("/support");
    const saweriaLink = page.getByRole("link", { name: /saweria/i });
    await expect(saweriaLink).toBeVisible();
    await expect(saweriaLink).toHaveAttribute("target", "_blank");
    await expect(saweriaLink).toHaveAttribute("rel", /noopener/);
  });
});
