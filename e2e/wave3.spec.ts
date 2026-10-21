import { expect, test } from "@playwright/test";

test("question of the week works signed out, with flash cards", async ({ page }) => {
  await page.goto("/q");
  await expect(page.getByText("Question of the week")).toBeVisible();
  const first = await page.getByRole("heading", { level: 1 }).textContent();
  await page.getByRole("button", { name: /Next question/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(first ?? "");
  await expect(page.getByText(/Question 2 of/)).toBeVisible();
  await page.getByRole("button", { name: /Share as a Status image/ }).click();
  await expect(page.getByRole("dialog", { name: "Share the question" })).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
});

test("welcome screen leads with safety, not claims we can't keep", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("✓ No sponsors, no selling")).toBeVisible();
  await expect(page.getByText("Selfie-verified")).toHaveCount(0);
});
