import { expect, test } from "@playwright/test";

test("onboarding → discover swipe → profile → like auth wall", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("You must be 18 or older to continue.")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/onboarding/city", { timeout: 90_000 });

  await expect(page.getByRole("heading", { name: "SOKO18 is live in Nairobi." })).toBeVisible();
  await page.getByRole("button", { name: "Continue in Nairobi" }).click();
  await page.waitForURL("**/onboarding/intent", { timeout: 90_000 });

  await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeVisible();
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/onboarding/ready", { timeout: 90_000 });

  await expect(page.getByText(/you.re ready/i)).toBeVisible();
  await page.getByRole("button", { name: "Discover" }).click();
  await page.waitForURL("**/discover", { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible();

  const name = page.locator(".cursor-grab p.font-display").first();
  const before = await name.textContent();
  await page.getByRole("button", { name: "Pass" }).click();
  await expect(name).not.toHaveText(before ?? "");
  const alt = await page.locator(".cursor-grab img").first().getAttribute("alt");
  const slug = `${alt?.split(",")[0]?.trim().toLowerCase()}-nairobi`;
  await page.goto(`/profile/${slug}`);

  await expect(page).toHaveURL(/\/profile\//);
  await page.getByRole("button", { name: "Like" }).click();

  await expect(page.getByRole("heading", { name: "Sign in to like" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
