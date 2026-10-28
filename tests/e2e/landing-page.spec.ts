import { expect, test } from "@playwright/test";

function contrastRatio(firstColor: string, secondColor: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length !== 3) throw new Error(`Unsupported color: ${color}`);
    const linear = channels.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  };
  const values = [luminance(firstColor), luminance(secondColor)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("Home loads with Arial typography and a visibly styled primary link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Máy pha thông minh. Quản lý cùng Dolores.");

  const bodyStyle = await page.locator("body").evaluate((element) => {
    const computed = getComputedStyle(element);
    return { fontFamily: computed.fontFamily, background: computed.backgroundColor };
  });
  expect(bodyStyle.fontFamily).toContain("Arial");
  expect(bodyStyle.background).toBe("rgb(248, 246, 243)");

  const headingFonts = await page.locator("h1, h2").evaluateAll((headings) =>
    headings.map((heading) => getComputedStyle(heading).fontFamily),
  );
  expect(headingFonts.length).toBeGreaterThan(1);
  expect(headingFonts.every((font) => font.includes("Arial"))).toBe(true);

  const primaryLink = page.getByRole("link", { name: "Khám phá giải pháp" });
  await expect(primaryLink).toBeVisible();
  const style = await primaryLink.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      horizontalPadding: computed.paddingLeft,
      background: computed.backgroundColor,
      borderRadius: computed.borderRadius,
    };
  });

  expect(style.height).toBeGreaterThanOrEqual(48);
  expect(style.horizontalPadding).not.toBe("0px");
  expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(style.borderRadius).toBe("10px");

  await page.keyboard.press("Tab");
  await primaryLink.focus();
  const focusStyle = await primaryLink.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { outlineStyle: computed.outlineStyle, outlineWidth: computed.outlineWidth };
  });
  expect(focusStyle.outlineStyle).toBe("solid");
  expect(focusStyle.outlineWidth).toBe("3px");

  const secondaryLink = page.getByRole("link", { name: "Xem nền tảng" });
  await expect(secondaryLink).toBeVisible();
  const secondaryStyle = await secondaryLink.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      height: element.getBoundingClientRect().height,
      color: computed.color,
      background: computed.backgroundColor,
    };
  });
  expect(secondaryStyle.height).toBeGreaterThanOrEqual(44);
  expect(secondaryStyle.color).toBe("rgb(184, 23, 36)");
  expect(secondaryStyle.background).toBe("rgb(255, 255, 255)");

  await expect(page.locator(".hero .button-row a")).toHaveCount(2);
  await expect(page.locator(".hero-note")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await primaryLink.hover();
  const reducedMotionStyle = await primaryLink.evaluate((element) => ({
    transitionDuration: getComputedStyle(element).transitionDuration,
    transform: getComputedStyle(element).transform,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));
  expect(reducedMotionStyle.transitionDuration).toBe("0s");
  expect(reducedMotionStyle.transform).toBe("none");
  expect(reducedMotionStyle.scrollBehavior).toBe("auto");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMenuButton = page.getByRole("button", { name: "Mở menu" });
  await expect(mobileMenuButton).toBeVisible();
  const mobileMenuButtonSize = await mobileMenuButton.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  });
  expect(mobileMenuButtonSize.width).toBeGreaterThanOrEqual(44);
  expect(mobileMenuButtonSize.height).toBeGreaterThanOrEqual(44);
});

test("landing presents the machine and platform without rendering sample news or testimonials", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await expect(page).toHaveTitle("DOLORES COFFEE | Máy pha và nền tảng quản lý");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Máy pha cà phê cùng nền tảng Dolores giúp theo dõi thiết bị, hợp đồng, hóa đơn và yêu cầu hỗ trợ.",
  );

  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText("Máy pha thông minh. Quản lý cùng Dolores.");
  await expect(page.getByRole("link", { name: "Khám phá giải pháp" })).toHaveAttribute("href", "/#solutions");
  await expect(page.getByRole("link", { name: "Xem nền tảng" })).toHaveAttribute("href", "/#technology");

  const machineImage = page.getByRole("img", { name: "Máy pha cà phê thông minh DOLORES COFFEE" });
  await expect(machineImage).toHaveCount(1);
  await expect(machineImage).toBeVisible();
  await expect(page.locator("#solutions img, #products img, #technology img")).toHaveCount(0);
  await expect(page.locator("#technology")).toContainText("Hợp đồng");
  await expect(page.locator("#technology")).toContainText("Hóa đơn");
  await expect(page.locator("#technology")).toContainText("hỗ trợ");

  await expect(page.getByText("Nguyễn Văn Minh", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Góc nhìn mới về ngành cà phê" })).toHaveCount(0);
  await expect(page.getByText("360°", { exact: true })).toHaveCount(0);
  await expect(page.locator('img[src*="unsplash.com"]')).toHaveCount(0);
  expect(requests.some((url) => /unsplash\.com|landing-hero-(desktop|mobile)|investment-savings|coffee-live-monitoring/.test(url))).toBe(false);
  await expect(page.getByRole("contentinfo")).toContainText("hello@dolorescoffee.vn");
  await expect(page.getByRole("contentinfo")).toContainText("1800 1234");
  await expect(page.getByRole("contentinfo")).toContainText("TP. Hồ Chí Minh, Việt Nam");

  const desktopLineCount = await heading.evaluate((element) => {
    const style = getComputedStyle(element);
    return Math.round(element.getBoundingClientRect().height / Number.parseFloat(style.lineHeight));
  });
  expect(desktopLineCount).toBeLessThanOrEqual(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("link", { name: "Khám phá giải pháp" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem nền tảng" })).toBeVisible();
  const mobileMetrics = await page.evaluate(() => {
    const heading = document.querySelector("h1");
    const image = document.querySelector(".hero-product-image img");
    const actions = document.querySelector(".hero .button-row");
    if (!heading || !image || !actions) return null;
    const headingStyle = getComputedStyle(heading);
    return {
      lineCount: Math.round(heading.getBoundingClientRect().height / Number.parseFloat(headingStyle.lineHeight)),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      actionsBottom: actions.getBoundingClientRect().bottom,
      imageTop: image.getBoundingClientRect().top,
    };
  });
  expect(mobileMetrics).not.toBeNull();
  expect(mobileMetrics!.lineCount).toBeLessThanOrEqual(3);
  expect(mobileMetrics!.documentWidth).toBeLessThanOrEqual(mobileMetrics!.viewportWidth);
  expect(mobileMetrics!.actionsBottom).toBeLessThan(mobileMetrics!.imageTop);

  await page.setViewportSize({ width: 320, height: 740 });
  const narrowDocumentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(narrowDocumentWidth).toBeLessThanOrEqual(320);
});

test("Home and /home show the same landing, login opens, and browser back returns to Home", async ({ page }) => {
  await page.goto("/");
  const homeTitle = await page.getByRole("heading", { level: 1 }).innerText();
  await expect(page).toHaveTitle("DOLORES COFFEE | Máy pha và nền tảng quản lý");

  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homeTitle);
  expect(await page.getByRole("link", { name: "Khám phá giải pháp" }).getAttribute("href"))
    .toMatch(/^\/(?:home)?#solutions$/);
  await page.getByRole("banner").getByRole("link", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(homeTitle);
});

test("landing remains visible and usable across the viewport matrix", async ({ page }) => {
  await page.goto("/");
  for (const width of [320, 390, 768, 1023, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const header = document.querySelector("header");
      const login = document.querySelector(".nav-login");
      const toggle = document.querySelector(".mobile-toggle");
      const desktopNavigation = document.querySelector(".nav-links");
      const primary = document.querySelector(".hero .button-row a");
      const machine = document.querySelector(".hero-product-image img");
      const rect = (element: Element | null) => {
        if (!element) return null;
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      if (!h1 || !header || !login || !toggle || !desktopNavigation || !primary || !machine) return null;
      const toggleStyle = getComputedStyle(toggle);
      const desktopStyle = getComputedStyle(desktopNavigation);
      const titleBox = rect(h1)!;
      const primaryBox = rect(primary)!;
      const machineBox = rect(machine)!;
      const intersects = primaryBox.left < machineBox.right && primaryBox.right > machineBox.left
        && primaryBox.top < machineBox.bottom && primaryBox.bottom > machineBox.top;
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        titleFits: titleBox.left >= 0 && titleBox.right <= window.innerWidth,
        primaryFits: primaryBox.left >= 0 && primaryBox.right <= window.innerWidth && primaryBox.height >= 48,
        machineFits: machineBox.left >= 0 && machineBox.right <= window.innerWidth,
        imageCoversPrimary: intersects,
        loginHeight: rect(login)!.height,
        toggleWidth: rect(toggle)!.width,
        toggleHeight: rect(toggle)!.height,
        toggleVisible: toggleStyle.display !== "none",
        desktopNavigationVisible: desktopStyle.display !== "none",
      };
    });
    expect(metrics, `layout metrics missing at ${width}px`).not.toBeNull();
    expect(metrics!.documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);
    expect(metrics!.titleFits, `H1 is clipped at ${width}px`).toBe(true);
    expect(metrics!.primaryFits, `primary CTA is clipped or too short at ${width}px`).toBe(true);
    expect(metrics!.machineFits, `machine image is clipped at ${width}px`).toBe(true);
    expect(metrics!.imageCoversPrimary, `machine overlaps the primary CTA at ${width}px`).toBe(false);

    if (width <= 1023) {
      expect(metrics!.loginHeight, `login target is too small at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(metrics!.toggleWidth, `menu target is too narrow at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(metrics!.toggleHeight, `menu target is too short at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(metrics!.toggleVisible).toBe(true);
      expect(metrics!.desktopNavigationVisible).toBe(false);
    } else {
      expect(metrics!.toggleVisible).toBe(false);
      expect(metrics!.desktopNavigationVisible).toBe(true);
    }
  }
});

test("keyboard focus follows the page order and operates the mobile disclosure", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const expectedDesktopLinks = [
    "/#top",
    "/#solutions",
    "/#products",
    "/#technology",
    "/login",
    "/#solutions",
  ];
  for (const href of expectedDesktopLinks) {
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toHaveAttribute("href", href);
  }
  const primaryFocus = await page.locator(":focus").evaluate((element) => ({
    outlineStyle: getComputedStyle(element).outlineStyle,
    outlineWidth: getComputedStyle(element).outlineWidth,
  }));
  expect(primaryFocus).toEqual({ outlineStyle: "solid", outlineWidth: "3px" });

  const mobilePage = await page.context().newPage();
  await mobilePage.setViewportSize({ width: 390, height: 844 });
  await mobilePage.goto("/");
  const menuButton = mobilePage.locator("#home-mobile-menu-toggle");
  await mobilePage.keyboard.press("Tab");
  await mobilePage.keyboard.press("Tab");
  await mobilePage.keyboard.press("Tab");
  await expect(menuButton).toBeFocused();
  await mobilePage.keyboard.press("Enter");
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  const navigation = mobilePage.getByRole("navigation", { name: "Điều hướng trên điện thoại" });
  await mobilePage.keyboard.press("Tab");
  const firstMobileLink = navigation.getByRole("link", { name: "Giải pháp" });
  await expect(firstMobileLink).toBeFocused();
  const mobileLinkHeight = await firstMobileLink.evaluate((element) => element.getBoundingClientRect().height);
  expect(mobileLinkHeight).toBeGreaterThanOrEqual(44);
  await mobilePage.keyboard.press("Enter");
  await expect(mobilePage).toHaveURL(/#solutions$/);
  await expect(navigation).toBeHidden();
});

test("landing keeps Arial, uses no external font, and meets text contrast and touch target checks", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Mở menu" })).toBeVisible();
  const styleReport = await page.evaluate(() => {
    const elements = [
      document.body,
      document.querySelector("h1"),
      document.querySelector("h2"),
      document.querySelector(".nav-links a"),
      document.querySelector(".hero .button-row a"),
      document.querySelector(".hero .button-row a:nth-child(2)"),
      document.querySelector(".footer-links"),
    ];
    const surfaceColor = (element: Element) => {
      let ancestor: Element | null = element;
      while (ancestor) {
        const color = getComputedStyle(ancestor).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color;
        ancestor = ancestor.parentElement;
      }
      return getComputedStyle(document.documentElement).backgroundColor;
    };
    const targets = elements.filter((element): element is Element => Boolean(element));
    const fonts = targets.map((element) => getComputedStyle(element).fontFamily);
    const contrast = targets.map((element) => ({
      foreground: getComputedStyle(element).color,
      background: surfaceColor(element),
    }));
    const links = Array.from(document.querySelectorAll("header a, .hero .button-row a, .contact-panel .button-row a, .footer-links a"))
      .filter((element) => element.getClientRects().length > 0);
    const linkHeights = links.map((element) => element.getBoundingClientRect().height);
    const menu = document.querySelector(".mobile-toggle")!.getBoundingClientRect();
    return { fonts, contrast, linkHeights, menu: { width: menu.width, height: menu.height } };
  });
  expect(styleReport.fonts.every((font) => font.includes("Arial"))).toBe(true);
  for (const [index, pair] of styleReport.contrast.entries()) {
    expect(contrastRatio(pair.foreground, pair.background), `contrast sample ${index}`).toBeGreaterThanOrEqual(4.5);
  }
  expect(styleReport.linkHeights.every((height) => height >= 44)).toBe(true);
  expect(styleReport.menu.width).toBeGreaterThanOrEqual(44);
  expect(styleReport.menu.height).toBeGreaterThanOrEqual(44);
  expect(requests.some((url) => /fonts\.googleapis|fonts\.gstatic|\.(woff2?|ttf|otf)(\?|$)/i.test(url))).toBe(false);
});

test("desktop header stays sticky and links only to the three supported navigation sections", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const header = page.getByRole("banner");
  const desktopNavigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  await expect(header).toBeVisible();
  await expect(desktopNavigation.getByRole("link")).toHaveCount(3);
  await expect(desktopNavigation.getByRole("link", { name: "Giải pháp" })).toHaveAttribute("href", "/#solutions");
  await expect(desktopNavigation.getByRole("link", { name: "Sản phẩm" })).toHaveAttribute("href", "/#products");
  await expect(desktopNavigation.getByRole("link", { name: "Công nghệ" })).toHaveAttribute("href", "/#technology");
  await expect(header.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute("href", "/login");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Khách hàng" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Tin tức" })).toHaveCount(0);

  const position = await header.evaluate((element) => getComputedStyle(element).position);
  expect(position).toBe("sticky");
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await expect.poll(() => header.evaluate((element) => element.getBoundingClientRect().top)).toBe(0);

  const visibleFragmentLinks = await page
    .locator("header nav a[href*='#'], footer a[href*='#']")
    .evaluateAll((links) =>
      links
        .filter((link) => {
          const style = getComputedStyle(link);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((link) => new URL((link as HTMLAnchorElement).href).hash.slice(1)),
    );
  for (const fragment of visibleFragmentLinks) {
    await expect(page.locator("#" + fragment)).toHaveCount(1);
  }
});

test("mobile disclosure supports Escape, hash navigation, and the visible login link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.locator("#home-mobile-menu-toggle");
  const loginLink = page.getByRole("banner").getByRole("link", { name: "Đăng nhập", exact: true });
  const navigation = page.getByRole("navigation", { name: "Điều hướng trên điện thoại" });

  await expect(loginLink).toBeVisible();
  await expect(loginLink).toHaveAttribute("href", "/login");
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  const menuId = await menuButton.getAttribute("aria-controls");
  expect(menuId).toBeTruthy();
  await expect(page.locator("#" + menuId)).toBeHidden();

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(menuButton).toHaveAccessibleName("Đóng menu");
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(navigation).not.toHaveAttribute("aria-modal", "true");

  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toHaveAccessibleName("Mở menu");
  await expect(menuButton).toBeFocused();

  await menuButton.click();
  await navigation.getByRole("link", { name: "Công nghệ" }).click();
  await expect(page).toHaveURL(/#technology$/);
  await expect(navigation).toBeHidden();
  const sectionTop = await page.locator("#technology").evaluate((element) => element.getBoundingClientRect().top);
  const headerBottom = await page.getByRole("banner").evaluate((element) => element.getBoundingClientRect().bottom);
  expect(sectionTop).toBeGreaterThanOrEqual(headerBottom - 1);

  await loginLink.click();
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile menu switches at 1024px and closes when resized to desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.goto("/");

  const desktopNavigation = page.getByRole("navigation", { name: "Điều hướng chính" });
  const menuButton = page.locator("#home-mobile-menu-toggle");
  const mobileNavigation = page.getByRole("navigation", { name: "Điều hướng trên điện thoại" });

  await expect(desktopNavigation).toBeHidden();
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(mobileNavigation).toBeVisible();

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(desktopNavigation).toBeVisible();
  await expect(mobileNavigation).toBeHidden();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(menuButton).toBeHidden();
});
