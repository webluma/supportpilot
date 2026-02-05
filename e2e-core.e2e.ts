import { expect, test } from "@playwright/test";

test.describe("Core loop - desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("create ticket, generate AI output, and reflect answered state in list", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());

    await page.route("**/api/ai/ticket-analysis", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          customerReply:
            "Thanks for reporting this. We are actively investigating and will share an update shortly.",
          qaSummary:
            "Issue confirmed on web checkout. Severity: High. Tagged for frontend follow-up.",
          followUpQuestions: [
            "Can you confirm if this happens in private browsing mode?",
            "Do you see any browser console errors during checkout?",
          ],
        }),
      });
    });

    await page.goto("/app/tickets");
    await page.getByRole("link", { name: /Create a new ticket|New Ticket/ }).click();

    const ticketTitle = `Playwright smoke ticket ${Date.now()}`;
    await page.getByLabel("Title").fill(ticketTitle);
    await page.getByLabel("Category").selectOption("Bug");
    await page.getByLabel("Priority").selectOption("High");
    await page.getByLabel("Channel").selectOption("Web");
    await page
      .getByLabel("Description")
      .fill("E2E flow to validate core loop with AI triage.");

    await page.getByRole("button", { name: "Create ticket" }).click();

    await expect(page.getByRole("button", { name: "Generate AI output" })).toBeVisible();
    await page.getByRole("button", { name: "Generate AI output" }).click();

    await expect(
      page
        .locator("p")
        .filter({ hasText: /^Customer Reply$/ })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator("p")
        .filter({ hasText: /^QA Summary$/ })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator("p")
        .filter({ hasText: /^Follow-up Questions$/ })
        .first()
    ).toBeVisible();

    const statusSelect = page.getByLabel("Status");
    await expect(statusSelect).toHaveValue("Resolved");

    await page.goto("/app/tickets");
    await expect(page.getByText(ticketTitle)).toBeVisible();

    const ticketCard = page
      .locator("div")
      .filter({ has: page.getByText(ticketTitle, { exact: true }) })
      .first();
    await expect(
      ticketCard.getByRole("button", { name: "Filter by answered AI status" })
    ).toBeVisible();
  });
});
