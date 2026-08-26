import { expect, test } from "@playwright/test";

test("profile overflow can save without an account", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Amani, 26/ })).toBeVisible();
  await page.getByRole("button", { name: "Remove Amani" }).click();
  await expect(page.getByRole("link", { name: /Amani, 26/ })).toHaveCount(0);
  await expect(page.getByText("Nothing saved yet.")).toBeVisible();
});

test("report from a profile is auth-walled", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to report" })).toBeVisible();
});
