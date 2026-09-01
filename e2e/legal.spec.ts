import { expect, test } from "@playwright/test";

test.describe("legal pages", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("terms, privacy, and safety are public", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms" })).toBeVisible();
    await expect(page.getByText("You must be 18 or older to use it.")).toBeVisible();

    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible();
    await expect(page.getByText("area-level only", { exact: false })).toBeVisible();

    await page.goto("/safety");
    await expect(page.getByRole("heading", { name: "Safety" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report and block" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toHaveCount(0);
    await page.getByRole("link", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });
});
