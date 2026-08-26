import { expect, test } from "@playwright/test";

test.describe("390px surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("discover", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("discover header leads with the last area", async ({ page }) => {
    await page.goto("/nairobi/kilimani");
    await expect(page.getByRole("heading", { name: "Kilimani" })).toBeVisible();
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
    await expect(page.getByText(/^Kilimani ·/)).toBeVisible();
  });

  test("matches empty sends you back to the card", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("browse is Nairobi with tabs", async ({ page }) => {
    await page.goto("/browse");
    await expect(page).toHaveURL(/\/nairobi$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Area-level only. Never a precise location.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await page.getByRole("link", { name: "Westlands" }).first().click();
    await expect(page).toHaveURL(/\/nairobi\/westlands/);
    await expect(page.getByRole("heading", { name: "Westlands" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await page.getByRole("navigation").getByText("Browse").click();
    await expect(page).toHaveURL(/\/nairobi$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await page.getByRole("button", { name: "Near you" }).click();
    await expect(page.getByText("Westlands. Area-level only.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Nia, 24/ }).first()).toBeVisible();
  });

  test("category stays in the Browse tab", async ({ page }) => {
    await page.goto("/nairobi");
    await page.getByRole("link", { name: "Trending" }).click();
    await expect(page).toHaveURL(/\/category\/trending/);
    await expect(page.getByRole("heading", { name: "Trending" })).toBeVisible();
    await expect(page.getByText("From real activity in Nairobi.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("profile", async ({ page }) => {
    await page.goto("/profile/amani-nairobi");
    await expect(page.getByRole("heading", { name: "Amani" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
  });

  test("profile back returns to Nairobi", async ({ page }) => {
    await page.goto("/nairobi");
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await page.getByRole("link", { name: /Amani, 26/ }).first().click();
    await expect(page).toHaveURL(/\/profile\/amani-nairobi/);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/nairobi/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
  });

  test("me keeps Safety and does not duplicate Nairobi", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByRole("heading", { name: "Me" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Saved" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Safety" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nairobi" })).toHaveCount(0);
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
  });

  test("other cities from Me does not restart onboarding", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByRole("link", { name: "Other cities" })).toHaveAttribute("href", "/onboarding/city");
    await page.evaluate(() => localStorage.setItem("soko18_onboarded", "1"));
    await page.goto("/onboarding/city");
    await expect(page.getByRole("heading", { name: "SOKO18 is live in Nairobi." })).toBeVisible();
    await page.getByRole("button", { name: "Discover Nairobi" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toHaveCount(0);
  });

  test("city waitlist first open still continues to intent", async ({ page }) => {
    await page.goto("/onboarding/city");
    await page.getByRole("button", { name: "Continue in Nairobi" }).click();
    await expect(page).toHaveURL(/\/onboarding\/intent/);
  });

  test("kisumu is waitlist with areas and tabs", async ({ page }) => {
    await page.goto("/city/kisumu");
    await expect(page).toHaveURL(/\/kisumu$/);
    await expect(page.getByRole("heading", { name: "Coming after Nairobi." })).toBeVisible();
    await expect(page.getByText("Kisumu").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Milimani" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
    await page.getByRole("link", { name: "Milimani" }).click();
    await expect(page).toHaveURL(/\/kisumu\/milimani/);
    await expect(page.getByRole("heading", { name: "Milimani" })).toBeVisible();
    await expect(page.getByText("Coming after Nairobi. Area-level only.")).toBeVisible();
    await page.getByRole("button", { name: "Discover Nairobi" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("closed thread sends you to Discover", async ({ page }) => {
    await page.goto("/messages/amani-nairobi");
    await expect(page.getByRole("heading", { name: "No thread yet" })).toBeVisible();
    await expect(page.getByText("Conversation unavailable.")).toHaveCount(0);
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("settings only has real privacy actions", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download my data" })).toBeVisible();
    await expect(page.getByText("Restrict messages")).toHaveCount(0);
    await expect(page.getByText("Hide last seen")).toHaveCount(0);
    await expect(page.getByText("Allow public search indexing")).toHaveCount(0);
    await expect(page.getByText("Public search indexing lives on your profile in Studio.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
  });

  test("studio stays on the Me tab", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByText("SOKO18 Studio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your studio" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("admin is 404 for guests", async ({ page }) => {
    const response = await page.goto("/admin", { timeout: 90_000 });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    expect(await page.content()).toContain("Not here");
  });
});
