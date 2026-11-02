import { expect, test, type Page } from "@playwright/test";

async function scrollOpening(page: Page, travel: number) {
  await page.evaluate((value) => {
    const opening = document.querySelector<HTMLElement>(".landing-opening")!;
    const stage = document.querySelector<HTMLElement>(".landing-opening-stage")!;
    const header = document.querySelector(".topbar")!.getBoundingClientRect().height;
    const top = opening.getBoundingClientRect().top + window.scrollY - header;
    window.scrollTo({ top: top + (opening.offsetHeight - stage.offsetHeight) * value, behavior: "instant" });
  }, travel);
}

test("desktop keeps the hero still, moves both pages horizontally, and returns on reverse scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "true");
  const hero = page.locator(".hero");
  const initial = await hero.boundingBox();
  await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
  await expect(page.locator(".hero-product-image")).toHaveCSS("transform", "none");
  await scrollOpening(page, 1 / 16);
  await expect.poll(async () => Math.round((await hero.boundingBox())!.x)).toBe(-720);
  expect(Math.abs((await hero.boundingBox())!.y - initial!.y)).toBeLessThanOrEqual(1);
  expect(Math.round((await page.locator(".digital-twin-section").boundingBox())!.x)).toBe(720);
  await expect(page.locator(".hero-content")).toHaveCSS("opacity", "1");
  await scrollOpening(page, 0);
  await expect.poll(async () => Math.round((await hero.boundingBox())!.x)).toBe(0);
  await expect(page.getByRole("link", { name: "Khám phá giải pháp", exact: true })).toBeVisible();
});

test("the whole machine stays still, details rotate at the active stop, and the final detail stays on screen", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "true");
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-model-ready", "true", { timeout: 60_000 });
  const cards = page.locator(".digital-twin-part-card");
  await scrollOpening(page, 1 / 8 + 7 / 8 * 0.21);
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-model-mode", "overview");
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-overview-visible", "true");
  await expect.poll(async () => cards.evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "0"))).toBe(true);
  for (let index = 0; index < 4; index++) {
    await scrollOpening(page, 1 / 8 + 7 / 8 * (0.22 + index * 0.18 + 0.18 * 0.20));
    await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-model-mode", "detail");
    await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-overview-visible", "false");
    await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-focused-part", String(index));
    await expect(cards.nth(index)).toHaveCSS("opacity", "1");
    await scrollOpening(page, 1 / 8 + 7 / 8 * (0.22 + index * 0.18 + 0.18 * 0.60));
    await expect(cards.nth(index)).toHaveCSS("opacity", "1");
    const copy = (await cards.nth(index).boundingBox())!;
    const model = (await page.locator(".digital-twin-panel").boundingBox())!;
    expect(copy.x + copy.width).toBeLessThan(model.x);
    expect(Math.abs(copy.y + copy.height / 2 - model.y - model.height / 2)).toBeLessThan(2);
    expect(model.x + model.width).toBeLessThanOrEqual(1440);
    if (index === 0) {
      const canvas = page.locator(".digital-twin-panel canvas");
      const before = await canvas.screenshot();
      await page.waitForTimeout(1000);
      expect((await canvas.screenshot()).equals(before)).toBe(false);
    }
  }
  await scrollOpening(page, 1);
  await expect(cards.nth(3)).toHaveCSS("opacity", "1");
  await expect(page.locator(".digital-twin-copy")).toHaveCSS("opacity", "1");
  await page.mouse.wheel(0, 600);
  await expect.poll(async () => (await page.locator(".landing-opening-stage").boundingBox())!.y).toBeLessThan(0);
  expect(errors).toEqual([]);
});

test("one cutaway machine reveals its internals while component copy types without another scroll", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "true");
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-model-ready", "true", { timeout: 60_000 });
  await scrollOpening(page, 1 / 8 + 7 / 8 * 0.11);
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-model-mode", "overview");
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-overview-visible", "true");
  await page.screenshot({ path: process.env.TEMP + "/dolores-cutaway-overview.png" });
  await scrollOpening(page, 1 / 8 + 7 / 8 * (0.22 + 0.18 * 0.33));
  await expect(page.locator(".digital-twin-section")).toHaveAttribute("data-focused-part", "0");
  const description = page.locator(".digital-twin-part-card").first().locator("p");
  const typedText = description.locator(".digital-twin-typed-text");
  await expect.poll(async () => Number(await typedText.getAttribute("data-visible-characters"))).toBeGreaterThan(0);
  const firstCount = Number(await typedText.getAttribute("data-visible-characters"));
  await page.waitForTimeout(350);
  expect(Number(await typedText.getAttribute("data-visible-characters"))).toBeGreaterThan(firstCount);
  await expect(description).toContainText("Cụm chứa nguyên liệu ở phía trên máy", { timeout: 8_000 });
  expect(await page.locator(".digital-twin-panel canvas").count()).toBe(1);
});

test("Digital Twin anchor reaches the full intro without leaving either page clipped", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "true");
  await page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Digital Twin" }).click();
  await expect.poll(async () => Math.abs((await page.locator(".digital-twin-section").boundingBox())!.x)).toBeLessThan(1);
  await expect(page.getByRole("heading", { name: "Khám phá từng cụm máy" })).toBeVisible();
});

test("mobile and reduced motion show readable vertical content without the scroll story", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "false");
    await expect(page.locator(".landing-opening-track")).toHaveCSS("transform", "none");
    const boxes = await page.locator(".digital-twin-part-card").evaluateAll((cards) => cards.map((card) => {
      const bounds = card.getBoundingClientRect();
      return { top: bounds.top, bottom: bounds.bottom, right: bounds.right, opacity: getComputedStyle(card).opacity };
    }));
    for (let index = 0; index < boxes.length; index++) {
      expect(boxes[index].opacity).toBe("1");
      expect(boxes[index].right).toBeLessThanOrEqual(width);
      if (index) expect(boxes[index].top).toBeGreaterThan(boxes[index - 1].bottom);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".landing-opening")).toHaveAttribute("data-scroll-story", "false");
  await expect(page.locator(".digital-twin-part-card").first()).toHaveCSS("opacity", "1");
});
