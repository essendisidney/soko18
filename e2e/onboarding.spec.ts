import { expect, test, type Page } from "@playwright/test";

async function fillAdultDob(page: Page) {
  const input = page.locator("#birthDate");
  await input.waitFor();
  await input.evaluate((el) => {
    const node = el as HTMLInputElement & { _valueTracker?: { setValue: (value: string) => void } };
    node._valueTracker?.setValue("");
    const native = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    native?.call(node, "1998-04-12");
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test("onboarding → discover swipe → profile → like auth wall", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("You must be 18 or older to continue.")).toBeVisible();
  await fillAdultDob(page);
  await expect(page.getByRole("button", { name: "Continue in Nairobi" })).toBeEnabled();
  await page.getByRole("button", { name: "Continue in Nairobi" }).click();
  await page.waitForURL("**/onboarding/intent", { timeout: 90_000 });

  await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeVisible();
  await page.getByRole("button", { name: "Connect" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/onboarding/privacy", { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Stay unseen" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await page.waitForURL("**/discover", { timeout: 90_000 });
  await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();

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
  expect(await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"))).toContain("like");
  await page.getByRole("link", { name: "Not now" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"))).toBeNull();
});
