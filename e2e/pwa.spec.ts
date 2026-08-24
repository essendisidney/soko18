import { expect, test } from "@playwright/test";

test.describe("PWA", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("manifest and icons are installable", async ({ request }) => {
    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBeTruthy();
    const body = (await manifest.json()) as {
      display: string;
      start_url: string;
      icons: { src: string; sizes: string }[];
    };
    expect(body.display).toBe("standalone");
    expect(body.start_url).toBe("/");
    expect(body.icons.some((icon) => icon.sizes === "192x192")).toBeTruthy();
    expect(body.icons.some((icon) => icon.sizes === "512x512")).toBeTruthy();

    const icon192 = await request.get("/icon/192");
    expect(icon192.ok()).toBeTruthy();
    expect(icon192.headers()["content-type"]).toContain("image/png");

    const icon512 = await request.get("/icon/512");
    expect(icon512.ok()).toBeTruthy();

    const apple = await request.get("/apple-icon");
    expect(apple.ok()).toBeTruthy();

    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBeTruthy();
    expect(await sw.text()).toContain("fetch");
  });

  test("Me explains how to add to the home screen", async ({ page }) => {
    await page.goto("/me");
    await expect(page.getByText("Add to Home Screen")).toBeVisible();
  });
});
