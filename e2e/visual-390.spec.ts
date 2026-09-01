import { expect, test } from "@playwright/test";

test.describe("390px surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("discover", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
  });

  test("guest like waits for sign-in then Not now keeps the card", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: "Like" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to like" })).toBeVisible();
    const pending = await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"));
    expect(pending).toContain("like");
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to like" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"))).toBeNull();
  });

  test("guest like can return to Discover without dropping the hold", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: "Like" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to like" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"))).toContain("like");
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("heading", { name: "Sign in to like" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("soko18_pending_engage"))).toContain("like");
  });

  test("discover header leads with the last area", async ({ page }) => {
    await page.goto("/nairobi/kilimani");
    await expect(page.getByRole("heading", { name: "Kilimani" })).toBeVisible();
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
    await expect(page.getByText(/Kilimani ·/)).toBeVisible();
  });

  test("mystery is one card not a swipe", async ({ page }) => {
    await page.goto("/discover");
    await page.getByRole("button", { name: /Mystery/ }).click();
    await page.getByRole("button", { name: /Settle sandbox/ }).click();
    await expect(page.getByRole("heading", { name: "One card" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page.getByRole("heading", { name: "One card" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nairobi" })).toBeVisible();
  });

  test("matches empty sends you back to the card", async ({ page }) => {
    await page.goto("/matches");
    await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
    await expect(page.getByText("No matches yet. A like stays quiet until they like you back.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("browse is Nairobi with tabs", async ({ page }) => {
    await page.goto("/browse");
    await expect(page).toHaveURL(/\/nairobi$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Area-level only. Never a precise location.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await expect(page.getByRole("link", { name: "Kisumu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mombasa" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nakuru" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Eldoret" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Thika", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Kakamega" })).toBeVisible();
    const nairobiLd = page.locator('script[type="application/ld+json"]');
    await expect(nairobiLd).toHaveCount(1);
    expect(JSON.parse((await nairobiLd.textContent()) ?? "{}").about.name).toBe("Nairobi");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/nairobi$/);
    await page.getByRole("link", { name: "Westlands" }).first().click();
    await expect(page).toHaveURL(/\/nairobi\/westlands/);
    await expect(page.getByRole("heading", { name: "Westlands" })).toBeVisible();
    expect(JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}").about.name).toBe(
      "Westlands",
    );
    expect(
      JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}").breadcrumb.itemListElement[1]
        .name,
    ).toBe("Westlands");
    await expect(page.locator('link[rel="canonical"][href$="/nairobi/westlands"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Kilimani" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All of Nairobi" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await page.getByRole("navigation").getByText("Browse").click();
    await expect(page).toHaveURL(/\/nairobi$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await page.getByRole("button", { name: "Near you" }).click();
    await expect(page.getByText("Westlands. Area-level only.")).toBeVisible();
    await expect(page.getByRole("link", { name: /Nia, 24/ }).first()).toBeVisible();
  });

  test("empty Nairobi search can notify without inventing people", async ({ page }) => {
    await page.goto("/nairobi");
    await page.getByPlaceholder("Search Nairobi").fill("zzzznotaperson");
    await expect(page.getByText("No one in Nairobi matches that.")).toBeVisible();
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
  });

  test("notify me from Me lists the wait", async ({ page }) => {
    await page.goto("/nairobi");
    await page.getByPlaceholder("Search Nairobi").fill("zzzznotaperson");
    await page.getByRole("button", { name: "Notify me" }).click();
    await page.goto("/me");
    const waiting = page.getByRole("link", { name: "Notify me" });
    await waiting.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await waiting.click();
    await expect(page).toHaveURL(/\/notify/);
    await expect(page.getByRole("heading", { name: "Notify me" })).toBeVisible();
    await expect(page.getByText("zzzznotaperson")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
    await expect(page.getByRole("button", { name: "Discover" })).toBeVisible();
    await page.getByRole("button", { name: "Remove zzzznotaperson" }).click();
    await expect(page.getByText("Nothing waiting.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("empty area after block can notify", async ({ page }) => {
    await page.goto("/nairobi/south-b");
    await expect(page.getByRole("heading", { name: "South B" })).toBeVisible();
    await page.getByRole("link", { name: /Chebet/ }).first().click();
    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("button", { name: "Block" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/nairobi\/south-b/);
    await expect(page.getByText("No one in South B yet.")).toBeVisible();
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
  });

  test("category stays in the Browse tab", async ({ page }) => {
    await page.goto("/nairobi");
    await page.getByRole("link", { name: "Trending" }).click();
    await expect(page).toHaveURL(/\/category\/trending/);
    await expect(page.getByRole("heading", { name: "Trending" })).toBeVisible();
    await expect(page.getByText("From real activity in Nairobi.")).toBeVisible();
    expect(JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}").name).toBe(
      "Trending · Nairobi",
    );
    expect(
      JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}").breadcrumb.itemListElement[1]
        .name,
    ).toBe("Trending");
    await expect(page.locator('link[rel="canonical"][href$="/category/trending"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All of Nairobi" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await page.goto("/category/verified");
    await expect(page.getByText("Phone, identity, and profile reviewed.")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
  });

  test("profile", async ({ page }) => {
    await page.goto("/profile/amani-nairobi");
    await expect(page.getByRole("heading", { name: "Amani" })).toBeVisible();
    await expect(page.getByText("SOKO18 Verified")).toBeVisible();
    await expect(page.getByText("Reviews after a match — two-way, before you continue.")).toBeVisible();
    await expect(page).toHaveTitle(/Amani, 26 · Kilimani, Nairobi/);
    await page.getByRole("button", { name: "View photos" }).click();
    await page.getByRole("button", { name: "Close photos" }).click();
    await expect(page.getByRole("heading", { name: "Amani" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await expect(page.getByRole("navigation").locator('a[href="/discover"]')).toHaveClass(/text-cream/);
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);
    expect(JSON.parse((await jsonLd.textContent()) ?? "{}").mainEntity.name).toBe("Amani");
    expect(JSON.parse((await jsonLd.textContent()) ?? "{}").breadcrumb.itemListElement.map((item: { name: string }) => item.name)).toEqual(
      ["Nairobi", "Kilimani", "Amani"],
    );
  });

  test("profile message without a match stays on the profile", async ({ page }) => {
    await page.goto("/profile/amani-nairobi");
    await page.getByRole("button", { name: "Message" }).click();
    await expect(page.getByRole("heading", { name: "Sign in to message" })).toBeVisible();
    await expect(page).not.toHaveURL(/\/messages\//);
    await page.getByRole("button", { name: "Not now" }).click();
    await expect(page).toHaveURL(/\/profile\/amani-nairobi/);
    await expect(page.getByRole("heading", { name: "Amani" })).toBeVisible();
  });

  test("profile back returns to Nairobi", async ({ page }) => {
    await page.goto("/nairobi");
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await page.getByRole("link", { name: /Amani, 26/ }).first().click();
    await expect(page).toHaveURL(/\/profile\/amani-nairobi/);
    await expect(page.getByRole("navigation").locator('a[href="/nairobi"]')).toHaveClass(/text-cream/);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/nairobi/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
  });

  test("me keeps Safety and does not duplicate Nairobi", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByRole("heading", { name: "Me" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Share Nairobi" })).toBeVisible();
    await page.getByRole("button", { name: "I’m here" }).click();
    await expect(page.getByText("Kilimani · here now")).toBeVisible();
    await expect(page.getByRole("link", { name: "Saved" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notify me" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Looking for" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Friend pass" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Safety" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Blocked" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nairobi" })).toHaveCount(0);
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
  });

  test("me friend pass opens invite", async ({ page }) => {
    await page.goto("/me");
    await page.locator('a[href="/invite"]').evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.locator('a[href="/invite"]').click();
    await expect(page).toHaveURL(/\/invite/);
    await expect(page.getByRole("heading", { name: "Friend pass", level: 1 })).toBeVisible();
    await expect(page.getByText("WhatsApp a real person. Staff review first. Empty stays empty.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("me shares the last Nairobi area", async ({ page }) => {
    await page.goto("/nairobi/westlands");
    await expect(page.getByRole("heading", { name: "Westlands" })).toBeVisible();
    await page.goto("/me");
    await expect(page.getByRole("button", { name: "Share Westlands" })).toBeVisible();
  });

  test("opted-out profiles stay off the index", async ({ page }) => {
    await page.goto("/profile/chebet-nairobi");
    await expect(page.getByRole("heading", { name: "Chebet" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });

  test("looking for from Me stays on the Me tab", async ({ page }) => {
    await page.goto("/me");
    const looking = page.getByRole("link", { name: "Looking for" });
    await looking.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await looking.click();
    await expect(page).toHaveURL(/\/intent/);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
    await page.getByRole("button", { name: "Connect" }).click();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("other cities from Me does not restart onboarding", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByRole("link", { name: "Other cities" })).toHaveAttribute("href", "/onboarding/city");
    await page.evaluate(() => localStorage.setItem("soko18_onboarded", "1"));
    await page.goto("/onboarding/city");
    await expect(page.getByRole("heading", { name: "SOKO18 is live in Kenya." })).toBeVisible();
    await expect(page.getByText("Use my area finds men around you. Area-level only. Never a precise location.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Thika" })).toBeVisible();
    await page.getByRole("button", { name: "Discover Nairobi" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await expect(page.getByRole("heading", { name: "What are you looking for?" })).toHaveCount(0);
  });

  test("city waitlist first open still continues to intent", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("soko18_age_ok", "1"));
    await page.goto("/onboarding/city");
    await page.getByRole("button", { name: "Continue in Nairobi" }).click();
    await expect(page).toHaveURL(/\/onboarding\/intent/);
  });

  test("kisumu is waitlist with areas and tabs", async ({ page }) => {
    await page.goto("/city/kisumu");
    await expect(page).toHaveURL(/\/kisumu$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByText("Kisumu").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Share Kisumu" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Milimani" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
    await page.getByRole("button", { name: /Skip the line/ }).click();
    await page.getByRole("button", { name: /Settle sandbox/ }).click();
    await expect(page.getByRole("button", { name: "Review next" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await page.goto("/me");
    const waiting = page.getByRole("link", { name: "Notify me" });
    await waiting.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await waiting.click();
    await expect(page.getByRole("heading", { name: "Notify me" })).toBeVisible();
    await expect(page.getByText("Kisumu", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove Kisumu" }).click();
    await expect(page.getByText("Nothing waiting.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await page.goto("/kisumu");
    await page.getByRole("link", { name: "Milimani" }).click();
    await expect(page).toHaveURL(/\/kisumu\/milimani/);
    await expect(page.getByRole("heading", { name: "Milimani" })).toBeVisible();
    await expect(page.getByText("Men around you. Area-level only.")).toBeVisible();
    await page.getByRole("button", { name: "I’m here" }).click();
    await expect(page.getByText("Milimani · here now")).toBeVisible();
    await expect(page.getByRole("button", { name: "Share Milimani" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("mombasa is waitlist with areas and tabs", async ({ page }) => {
    await page.goto("/city/mombasa");
    await expect(page).toHaveURL(/\/mombasa$/);
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Mombasa").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Nyali" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await page.getByRole("link", { name: "Nyali" }).click();
    await expect(page).toHaveURL(/\/mombasa\/nyali/);
    await expect(page.getByRole("heading", { name: "Nyali" })).toBeVisible();
    await page.getByRole("link", { name: "All of Mombasa" }).click();
    await expect(page).toHaveURL(/\/mombasa$/);
  });

  test("nakuru and eldoret are waitlist doors", async ({ page }) => {
    await page.goto("/nakuru");
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("link", { name: "Section 58" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await page.goto("/eldoret");
    await expect(page.getByRole("link", { name: "Elgon View" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await expect(page.getByRole("navigation").getByText("Browse")).toBeVisible();
    await page.getByRole("link", { name: "Elgon View" }).click();
    await expect(page).toHaveURL(/\/eldoret\/elgon-view/);
    await expect(page.getByRole("heading", { name: "Elgon View" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("thika is a Kenya waitlist door without a fake catalog", async ({ page }) => {
    await page.goto("/thika");
    await expect(page.getByRole("heading", { name: "Local discovery" })).toBeVisible();
    await expect(page.getByText("Men around you in Thika. Area-level only. Never a precise location.")).toBeVisible();
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Amani/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Makongeni" })).toBeVisible();
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("button", { name: "You’re on the list" })).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("incomplete checks do not wear SOKO18 Verified", async ({ page }) => {
    await page.goto("/profile/nia-nairobi");
    await expect(page.getByRole("heading", { name: "Nia" })).toBeVisible();
    await expect(page.getByText("SOKO18 Verified")).toHaveCount(0);
    await expect(page.getByText("✓ Phone verified")).toBeVisible();
    await expect(page.getByText("○ Identity verified")).toHaveCount(0);
    await expect(page.getByText("○ Profile reviewed")).toBeVisible();
  });

  test("studio profile can send you to Discover before review", async ({ page }) => {
    await page.goto("/studio/profile");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText("Draft · Nairobi · not public")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("create profile in review returns to Discover", async ({ page }) => {
    await page.goto("/me");
    await page.getByRole("button", { name: "Create profile" }).click();
    await expect(page).toHaveURL(/\/studio\/profile/);
    await page.getByLabel("Username").fill("Sid");
    await page.getByLabel("Born").fill("2000");
    await page.getByRole("button", { name: "Kilimani" }).click();
    await page.getByLabel("About").fill("Kilimani evenings.");
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText("In review. Not public.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
    await page.goto("/me");
    await expect(page.getByRole("button", { name: "In review" })).toBeVisible();
  });

  test("closed thread sends you to Discover", async ({ page }) => {
    await page.goto("/messages/amani-nairobi");
    await expect(page.getByRole("heading", { name: "No thread yet" })).toBeVisible();
    await expect(page.getByText("Conversation unavailable.")).toHaveCount(0);
    await expect(page.getByRole("navigation").locator('a[href="/matches"]')).toHaveClass(/text-cream/);
    await expect(page.getByRole("navigation").getByText("New")).toHaveCount(0);
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
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("studio stays on the Me tab", async ({ page }) => {
    await page.goto("/studio");
    await expect(page.getByText("SOKO18 Studio")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your studio" })).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Me")).toBeVisible();
    await expect(page.getByRole("navigation").getByText("Discover")).toBeVisible();
    await expect(page.getByText("Boost your profile")).toHaveCount(0);
    await expect(page.getByText("Boost after you’re live in Nairobi.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("studio settings send you to Discover", async ({ page }) => {
    await page.goto("/studio/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("link", { name: "Public search indexing" }).click();
    await expect(page).toHaveURL(/\/studio\/profile/);
    await page.goto("/studio/settings");
    await page.getByRole("link", { name: "Account privacy" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await page.goto("/studio/settings");
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("studio analytics unsigned sends you to Discover", async ({ page }) => {
    await page.goto("/studio/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Sign in to see your studio stats.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("studio promotions unsigned sends you to Discover", async ({ page }) => {
    await page.goto("/studio/promotions");
    await expect(page.getByRole("heading", { name: "Promotions" })).toBeVisible();
    await expect(page.getByText("Boost after you’re live. Nairobi Now is not for sale.")).toBeVisible();
    await expect(page.getByText("Golden Hour")).toBeVisible();
    await expect(page.getByText("8–9pm EAT pin. Not a discounted meet.")).toBeVisible();
    await page.getByRole("button", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("sign in can send you back to Discover", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page.getByRole("link", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("missing profile sends you to Discover", async ({ page }) => {
    const response = await page.goto("/profile/zzzz-not-here");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Not here")).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page.getByRole("link", { name: "Discover" }).click();
    await expect(page).toHaveURL(/\/discover/);
  });

  test("admin is 404 for guests", async ({ page }) => {
    const response = await page.goto("/admin", { timeout: 90_000 });
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Overview" })).toHaveCount(0);
    expect(await page.content()).toContain("Not here");
  });
});
