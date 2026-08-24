import { expect, test } from "@playwright/test";

test("returning open is Nairobi pulse then Discover", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "nairobi");
  });
  await page.goto("/");
  await expect(page.getByText(/Nairobi is active/i)).toBeVisible();
  await expect(page.getByText("new matches")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
  await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
  await expect(page.getByText(/Westlands · Kilimani/)).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/discover/);
});
