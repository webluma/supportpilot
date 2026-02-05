import { expect, test } from "@playwright/test";

test.describe("Settings mobile hardening", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("no horizontal overflow and integrations modal stays inside viewport", async ({ page }) => {
    await page.goto("/app/settings");

    const bodyOverflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(bodyOverflow.width).toBeLessThanOrEqual(bodyOverflow.client + 2);

    const connectBtn = page
      .getByRole("button", { name: /Connect|Manage/ })
      .first();
    await connectBtn.click();
    await expect(
      page.getByRole("heading", { name: /^Connect /i })
    ).toBeVisible();

    const overflowAfterModal = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflowAfterModal.width).toBeLessThanOrEqual(overflowAfterModal.client + 2);

    await page.getByRole("button", { name: /Cancel|Close/ }).click();

    await page.getByRole("button", { name: "Export tickets CSV" }).click();
    await expect(
      page.getByRole("heading", { name: "Audit log" })
    ).toBeVisible();
  });
});
