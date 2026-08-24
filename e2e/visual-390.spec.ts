import { expect, test } from "@playwright/test";

test.describe("390px surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("discover", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("browse", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Area-level only. Never a precise location.")).toBeVisible();
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
