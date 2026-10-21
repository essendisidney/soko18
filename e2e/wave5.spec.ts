import { expect, test } from "@playwright/test";

test("ambassador kit has the rules and a ready Status message", async ({ page }) => {
  await page.goto("/kit");
  await expect(page.getByRole("heading", { name: "Help open your campus" })).toBeVisible();
  await expect(page.getByText("Never near schools, and never to anyone under 18.", { exact: false })).toBeVisible();
  await expect(page.getByText("For your Status (question of the week)")).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp/ }).first()).toHaveAttribute("href", /wa\.me/);
});

test("a poster for a campus that doesn't exist is a 404", async ({ page }) => {
  const res = await page.goto("/poster/not-a-campus");
  expect(res?.status()).toBe(404);
});
