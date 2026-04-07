import { test, expect } from "@playwright/test";

/**
 * PRD: UC-3 Classification, AC-2.5 New→Triaged; Module D triage path.
 * Why: BCR accept flow must persist and reflect on detail view.
 */
test.describe("Triage accept and cross-page consistency", () => {
  test("Accept & Route on a New issue moves it to Triaged and detail matches", async ({
    page,
  }) => {
    await page.goto("/triage?status=New");
    const accept = page.getByRole("button", { name: "Accept & Route" }).first();
    await expect(accept).toBeVisible({ timeout: 20_000 });
    const issueId = (
      await page.locator('a[href^="/issues/ISS-"]').first().textContent()
    )?.trim();
    expect(issueId).toMatch(/^ISS-\d+$/);

    const patchResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/issues/${issueId}`) &&
        res.request().method() === "PATCH",
    );
    await accept.click();
    const res = await patchResponse;
    expect(res.ok()).toBeTruthy();

    await page.goto(`/issues/${issueId}`);
    await expect(page.locator("main")).toContainText("Triaged");

    await page.goto("/triage?status=Triaged");
    await expect(page.locator("main").getByText(issueId!)).toBeVisible();
  });
});
