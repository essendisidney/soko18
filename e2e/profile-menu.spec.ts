import { expect, test } from "@playwright/test";

test("profile overflow can save without an account", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Amani, 26/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Amani" }).click();
  await expect(page.getByRole("link", { name: /Amani, 26/ })).toHaveCount(0);
  await expect(page.getByText("Nothing saved yet.")).toBeVisible();
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
});

test("blocked people leave similar", async ({ page }) => {
  await page.goto("/profile/nyambura-nairobi");
  await expect(page.getByRole("link", { name: /Amani/ })).toBeVisible();
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Block" }).click();
  await expect(page.getByText("Blocked. Hidden from Discover.")).toBeVisible();
  await page.goto("/profile/nyambura-nairobi");
  await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
});

test("pass from a profile leaves Discover", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Pass" }).click();
  await expect(page).toHaveURL(/\/discover/);
  await expect(page.getByRole("img", { name: /Amani/ })).toHaveCount(0);
});

test("block on a profile sends you back to Discover", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Block" }).click();
  await expect(page.getByText("You blocked them. They won’t appear in Discover or Browse.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Like" })).toHaveCount(0);
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
});

test("blocked people live on Me", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Block" }).click();
  await expect(page.getByText("Blocked. Hidden from Discover.")).toBeVisible();
  await page.goto("/blocked");
  await expect(page.getByRole("heading", { name: "Blocked" })).toBeVisible();
  await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
  await expect(page.getByRole("link", { name: /Amani, 26/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
  await page.getByRole("button", { name: "Unblock Amani" }).click();
  await expect(page.getByText("No one blocked.")).toBeVisible();
});

test("report from a profile is auth-walled", async ({ page }) => {
  await page.goto("/profile/amani-nairobi");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Report" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to report" })).toBeVisible();
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
});
