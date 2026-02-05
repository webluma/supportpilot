import { expect, test } from "@playwright/test";

test.describe("Settings flow - desktop", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("save/discard, integrations, audit log, and settings export", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());

    await page.goto("/app/settings");

    const workspaceNameInput = page.getByLabel("Workspace name");
    const originalName = (await workspaceNameInput.inputValue()).trim();

    await workspaceNameInput.fill(`${originalName} Updated`);
    await expect(page.getByText("You have unsaved changes")).toBeVisible();

    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByText("You have unsaved changes")).toBeHidden();
    await expect(workspaceNameInput).toHaveValue(originalName);

    await workspaceNameInput.fill(`${originalName} Saved`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(
      page.locator("div").filter({ hasText: /^Settings saved$/ }).first()
    ).toBeVisible();

    await page.getByRole("button", { name: "Connect" }).first().click();
    await expect(page.getByRole("heading", { name: /^Connect /i })).toBeVisible();
    await page.getByRole("button", { name: "Confirm connection" }).click();

    await expect(page.getByText("Connected").first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "integration.connected" })).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download settings JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("settings.json");

    await expect(page.getByRole("cell", { name: "export.settings" })).toBeVisible();
  });
});
