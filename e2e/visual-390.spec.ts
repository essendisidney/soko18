import { expect, test } from "@playwright/test";

test.describe("390px surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("discover", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("matches empty sends you back to the card", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("browse is Nairobi with tabs", async ({ page }) => {
    await page.goto("/browse");
    await expect(page).toHaveURL(/\/nairobi$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Area-level only. Never a precise location.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await page.getByRole("link", { name: "Westlands" }).first().click();
    await expect(page).toHaveURL(/\/nairobi\/westlands/);
    await expect(page.getByRole("heading", { name: "Westlands" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
  });

  test("category stays in the Browse tab", async ({ page }) => {
    await page.goto("/nairobi");
    await page.getByRole("link", { name: "Trending" }).click();
    await expect(page).toHaveURL(/\/category\/trending/);
    await expect(page.getByRole("heading", { name: "Trending" })).toBeVisible();
    await expect(page.getByText("From real activity in Nairobi.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("profile", async ({ page }) => {
    await page.goto("/profile/amani-nairobi");
    await expect(page.getByRole("heading", { name: "Amani" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
  });

  test("studio", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByText("SOKO18 Studio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your studio" })).toBeVisible();
  });

  test("admin is 404 for guests", async ({ page }) => {
    const response = await page.goto("/admin", { timeout: 90_000 });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    expect(await page.content()).toContain("Not here");
  });
});
