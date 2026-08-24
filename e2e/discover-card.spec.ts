import { expect, test } from "@playwright/test";

test("discover card shows a face", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "nairobi");
  });
  await page.goto("/discover");
  const card = page.locator(".cursor-grab img").first();
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(280);
  await page.screenshot({ path: "test-results/discover-card.png", fullPage: true });
});
