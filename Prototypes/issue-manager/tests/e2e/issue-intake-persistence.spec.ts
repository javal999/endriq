import { test, expect } from "@playwright/test";

/**
 * PRD: UC-1 Issue Submission, AC-1.2; Module A ingestion; persistence OG-3.
 * Why: new issues must survive refresh and re-navigation (production parity goal).
 */
test.describe("Issue intake and persistence", () => {
  test("guided submit creates issue ID and text survives hard refresh and search", async ({
    page,
  }) => {
    const marker = `E2E-PERSIST-${Date.now()}`;
    const description = `${marker} SAP DOTS gagal sync saat kirim DO.`;

    await page.goto("/submit");
    await page.locator("select").nth(0).selectOption("SURABAYA");
    await page.locator("select").nth(1).selectOption("Administrator");
    await page.locator("select").nth(2).selectOption("Admin");
    await page.getByRole("button", { name: "Next" }).click();

    await page.locator("textarea").fill(description);
    await page.getByRole("button", { name: "Analyze & Continue" }).click();

    await expect(
      page.getByRole("heading", { name: "Step 3: AI Classification" }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Proceed to Submit" }).click();
    await page.getByRole("button", { name: "Submit Issue" }).click();

    await expect(page.getByRole("heading", { name: "Issue Submitted" })).toBeVisible({
      timeout: 20_000,
    });
    const detailLink = page.locator('a[href^="/issues/ISS-"]').first();
    await expect(detailLink).toBeVisible();
    const href = await detailLink.getAttribute("href");
    const issueId = href?.replace("/issues/", "").trim();
    expect(issueId).toMatch(/^ISS-\d+$/);

    await page.goto(`/issues?q=${encodeURIComponent(marker)}`);
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    await page.reload();
    await expect(page.getByText(marker, { exact: false })).toBeVisible();

    await page.goto("/");
    await page.goto(`/issues/${issueId}`);
    await expect(page.locator("main")).toContainText(marker);
  });
});
