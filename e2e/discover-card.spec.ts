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

test("empty deck can undo last pass", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "nairobi");
  });
  await page.goto("/discover");
  const ids = await page.evaluate(async () => {
    const res = await fetch("/api/discover?city=nairobi");
    const json = (await res.json()) as { data?: { items?: { id: string }[] } };
    return (json.data?.items ?? []).map((item) => item.id);
  });
  expect(ids.length).toBeGreaterThan(0);
  await page.evaluate((profileIds) => {
    localStorage.setItem(
      "soko18_discover_actions",
      JSON.stringify(profileIds.map((id, i) => ({ profileId: id, kind: "pass", at: Date.now() - i }))),
    );
  }, ids);
  await page.reload();
  await expect(page.getByText("That’s everyone in Nairobi")).toBeVisible();
  await page.getByRole("button", { name: "Undo last pass" }).click();
  await expect(page.locator(".cursor-grab img").first()).toBeVisible();
});

test("empty deck browse opens the last area", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("soko18_onboarded", "1");
    localStorage.setItem("soko18_age_ok", "1");
    localStorage.setItem("soko18_city", "nairobi");
  });
  await page.goto("/nairobi/kilimani");
  await expect(page.getByRole("heading", { name: "Kilimani" })).toBeVisible();
  const ids = await page.evaluate(async () => {
    const res = await fetch("/api/discover?city=nairobi");
    const json = (await res.json()) as { data?: { items?: { id: string }[] } };
    return (json.data?.items ?? []).map((item) => item.id);
  });
  expect(ids.length).toBeGreaterThan(0);
  await page.evaluate((profileIds) => {
    localStorage.setItem(
      "soko18_discover_actions",
      JSON.stringify(profileIds.map((id, i) => ({ profileId: id, kind: "pass", at: Date.now() - i }))),
    );
  }, ids);
  await page.goto("/discover");
  await expect(page.getByText("That’s everyone in Nairobi")).toBeVisible();
  await page.getByRole("button", { name: "Browse Kilimani" }).click();
  await expect(page).toHaveURL(/\/nairobi\/kilimani/);
  await expect(page.getByRole("heading", { name: "Kilimani" })).toBeVisible();
});


