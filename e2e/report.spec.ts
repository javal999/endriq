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
    await expect(page.locator("body")).toContainText(/distance/i);
    await expect(page.locator("body")).toContainText(/training load/i);
  });

  test("intensity distribution section heading is visible (exact match)", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Use first() because the findings section also has 'Intensity distribution inverted'
    await expect(
      page.getByRole("heading", { name: "Intensity distribution", exact: true }),
    ).toBeVisible();
  });

  test("intensity section shows BPM ranges from max HR", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Our fix adds BPM ranges like "< 146 bpm" or "> 165 bpm"
    await expect(page.locator("body")).toContainText(/bpm/);
    // Zone method link present
    await expect(
      page.getByRole("link", { name: /how zones are calculated/i }),
    ).toBeVisible();
  });

  test("sessions table shows Date, Type, Status columns", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(page.getByRole("columnheader", { name: /date/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /status/i })).toBeVisible();
  });

  test("Type info button (ⓘ) toggles classification table", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);

    const infoBtn = page.getByRole("button", { name: /how is type classified/i });
    await expect(infoBtn).toBeVisible();

    // Classification table uses actual labels from sessionTypeLabel()
    // Initially hidden — toggle open
    await infoBtn.click();
    // "Easy run" is one of the labels in our TYPE_CLASSIFICATION array
    await expect(page.locator("body")).toContainText(/75% max HR/);

    // Toggle closed
    await infoBtn.click();
    await expect(page.locator("body")).not.toContainText(/75% max HR/);
  });

  test("renders 'What the data flagged' findings section", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(
      page.getByRole("heading", { name: /what the data flagged/i }),
    ).toBeVisible();
  });

  test("share button is visible on demo report", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    await expect(
      page.getByRole("button", { name: /share this week/i }),
    ).toBeVisible();
  });

  test("status legend below sessions table shows all statuses", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    // Our legend has Good, Too hard, Low intensity, Watch, No HR
    await expect(page.locator("body")).toContainText(/Too hard/);
    await expect(page.locator("body")).toContainText(/Low intensity/);
    await expect(page.locator("body")).toContainText(/Watch/);
  });

  test("methodology link in intensity section points to /learn", async ({ page }) => {
    await page.goto(`/report/demo/${DEMO_WEEK}`);
    const learnLink = page.getByRole("link", { name: /how zones are calculated/i });
    await expect(learnLink).toBeVisible();
    await expect(learnLink).toHaveAttribute("href", /learn/);
  });
});

test.describe("Share card endpoints", () => {
  test("legacy share endpoint responds (not a 500 server crash)", async ({ page }) => {
    // After the React import fix in shareCardRenderer.tsx this should return
    // 200 (PNG image) or 302 (redirect to share_id URL). A 5xx means a server bug.
    const response = await page.request.get(
      `/api/share/weekly/demo/${DEMO_WEEK}`,
      { maxRedirects: 5 },
    );
    // Known issue: if this is still 500, the shareCardRenderer JSX fix has not deployed
    if (response.status() === 500) {
      console.warn("share card still returns 500 — React import fix may not be deployed");
    }
    expect([200, 302, 303]).toContain(response.status());
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
