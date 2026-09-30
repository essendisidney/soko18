import { expect, test } from "@playwright/test";

test("returning open is Nairobi pulse then Discover", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "nairobi");
    document.cookie = "soko18_city=nairobi; Path=/";
  });
  await page.goto("/");
  await expect(page.getByText(/Nairobi is active/i)).toBeVisible();
  await expect(page.getByText("new matches")).toHaveCount(0);
  await page.getByRole("button", { name: "Discover" }).click();
  await expect(page).toHaveURL(/\/discover/);
  await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/discover/);
});

test("returning kisumu open does not invent Nairobi pulse", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "kisumu");
    document.cookie = "soko18_city=kisumu; Path=/";
    localStorage.setItem("soko18_near_area", "milimani");
  });
  await page.goto("/");
  await expect(page.getByText(/Nairobi is active/i)).toHaveCount(0);
  await expect(page.getByText("Kisumu. Singles near you.")).toBeVisible();
  await expect(page.getByText("new matches")).toHaveCount(0);
  await expect(page.getByText("Milimani").first()).toBeVisible();
  await page.getByRole("link", { name: "Browse Kisumu" }).click();
  await expect(page).toHaveURL(/\/kisumu$/);
});
