import { expect, test } from "@playwright/test";

test.describe("Core loop - desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("create ticket, resolve, export CSV and see audit log", async ({ page }) => {
    await page.goto("/app/tickets");
    await page.getByRole("link", { name: /Create a new ticket|New Ticket/ }).click();

    await page.getByLabel("Title").fill("Playwright smoke ticket");
    await page.getByLabel("Category").selectOption("Bug");
    await page.getByLabel("Priority").selectOption("High");
    await page.getByLabel("Channel").selectOption("Web");
    await page
      .getByLabel("Description")
      .fill("E2E flow to validate core loop with AI triage.");

    await page.getByRole("button", { name: "Create ticket" }).click();

    const statusSelect = page.getByLabel("Status");
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption("Resolved");
    await expect(statusSelect).toHaveValue("Resolved");

    await page.goto("/app/settings");
    await page.getByRole("button", { name: "Export tickets CSV" }).click();

    await expect(
      page.getByRole("heading", { name: "Audit log" })
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "ticket.export_csv" })
    ).toBeVisible();
  });
});
