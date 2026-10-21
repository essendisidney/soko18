import { expect, test } from "@playwright/test";

test("Show me starts on Everyone, so one pick is enough to reach Discover", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("soko18_age_ok", "1"));
  await page.goto("/onboarding/intent");
  await expect(page.getByRole("button", { name: "Everyone" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "A relationship" }).click();
  await page.getByRole("button", { name: "Show me people" }).click();
  await page.waitForURL("**/discover", { timeout: 90_000 });
  expect(await page.evaluate(() => localStorage.getItem("soko18_show_me"))).toBe("any");
});

test("the store opens on the plan the button promised", async ({ page }) => {
  await page.goto("/upgrade?plan=gold_week");
  await expect(page.getByRole("button", { name: /Pay with M-Pesa · KES\s?149/ })).toBeVisible();
  await expect(page.getByPlaceholder("0712 345 678")).toBeVisible();
});

test("old onboarding pages are gone", async ({ page }) => {
  const res = await page.goto("/onboarding/ready");
  expect(res?.status()).toBe(404);
});
