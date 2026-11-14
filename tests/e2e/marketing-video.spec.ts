import { test, expect, type Page } from "@playwright/test";

async function blockModels(page: Page) {
  const requests: string[] = [];
  await page.route(/\.glb(?:\?|$)|cdn\.jsdelivr\.net\/npm\/three/, (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  return requests;
}

test("landing hero plays and pauses video without requesting a 3D model", async ({ page }) => {
  const models = await blockModels(page);
  await page.goto("/");
  const landing = page.frameLocator('iframe[src="/digital-twin-landing.html"]');
  const video = landing.locator("#hero-video");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime > 0 && !element.paused)).toBe(true);
  await expect(landing.locator("#film-loading, #journey-host canvas")).toHaveCount(0);
  await landing.getByRole("button", { name: "Tạm dừng hoạt ảnh máy pha" }).click();
  await expect(video).toHaveJSProperty("paused", true);
  await landing.getByRole("button", { name: "Phát hoạt ảnh máy pha", exact: true }).click();
  await expect(video).toHaveJSProperty("paused", false);
  expect(models).toEqual([]);
});

test("login illustration uses video with pause controls and no WebGL iframe", async ({ page }) => {
  const models = await blockModels(page);
  await page.goto("/login");
  const video = page.locator(".login-model");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime > 0 && !element.paused)).toBe(true);
  await expect(page.locator(".login-illustration iframe, .login-illustration canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Tạm dừng hoạt ảnh máy pha" }).click();
  await expect(video).toHaveJSProperty("paused", true);
  expect(models).toEqual([]);
});

test("reduced motion keeps both illustrations paused with their posters", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const landing = page.frameLocator('iframe[src="/digital-twin-landing.html"]');
  const hero = landing.locator("#hero-video");
  await expect(landing.locator("#intro")).toHaveCount(0);
  await expect(hero).toHaveJSProperty("paused", true);
  await expect(hero).toHaveAttribute("poster", "/video/dolores-machine-reveal.jpg");
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Phát hoạt ảnh máy pha", exact: true })).toBeVisible();
  await expect(page.locator(".login-model")).toHaveJSProperty("paused", true);
  await expect(page.locator(".login-model")).toHaveAttribute("poster", "/video/dolores-machine-login.jpg");
});

test("mobile landing selects the portrait video and adapts when resized", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const models = await blockModels(page);
  await page.goto("/");
  const landing = page.frameLocator('iframe[src="/digital-twin-landing.html"]');
  const video = landing.locator("#hero-video");
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.videoHeight > element.videoWidth && !element.paused)).toBe(true);
  await expect(video).toHaveAttribute("poster", "/video/dolores-machine-reveal-mobile.jpg");
  expect(await video.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.videoWidth > element.videoHeight && !element.paused)).toBe(true);
  expect(models).toEqual([]);
});
