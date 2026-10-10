import { expect, test } from "@playwright/test";

test.describe("mega menu (desktop)", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1180, "desktop navigation only");

  test("hover opens, switching panels keeps one open, outside click closes", async ({ page }) => {
    await page.goto("/");
    const reisen = page.locator('.hdr__trigger[data-mx="reisen"]');
    const bus = page.locator('.hdr__trigger[data-mx="bus"]');
    await reisen.hover();
    await expect(page.locator("#mx-reisen")).toBeVisible();
    await expect(reisen).toHaveAttribute("aria-expanded", "true");

    await bus.hover();
    await expect(page.locator("#mx-bus")).toBeVisible();
    await expect(page.locator("#mx-reisen")).toBeHidden();
    await expect(page.locator(".mx-panel:not([hidden])")).toHaveCount(1);
    await expect(page.locator("#mx-bus").getByRole("link", { name: /Jetzt Bus anfragen/ })).toBeVisible();

    await page.mouse.click(700, 860);
    await expect(page.locator(".mx-panel:not([hidden])")).toHaveCount(0);
  });

  test("keyboard: Enter opens, Tab reaches panel links, Escape closes and restores focus", async ({ page }) => {
    await page.goto("/");
    const reisen = page.locator('.hdr__trigger[data-mx="reisen"]');
    await reisen.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#mx-reisen")).toBeVisible();
    await page.keyboard.press("Tab");
    const focusedInPanel = await page.evaluate(() => !!document.activeElement?.closest("#mx-reisen"));
    expect(focusedInPanel).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator("#mx-reisen")).toBeHidden();
    await expect(reisen).toBeFocused();
  });

  test("header turns into light glass on scroll and marks the active section", async ({ page }) => {
    await page.goto("/bus-mieten");
    await expect(page.locator('.hdr__trigger[data-mx="bus"]')).toHaveClass(/is-current/);
    await page.goto("/");
    await expect(page.locator(".hdr")).toHaveAttribute("data-state", "top");
    await page.mouse.wheel(0, 900);
    await expect(page.locator(".hdr")).toHaveAttribute("data-state", "scrolled");
    await page.waitForTimeout(400);
    // resolve whatever colour syntax the browser reports (oklab, color-mix…) to sRGB pixels
    const rgb = await page.locator(".hdr").evaluate((el) => {
      const ctx = document.createElement("canvas").getContext("2d")!;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = getComputedStyle(el).backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    });
    expect(Math.min(...rgb)).toBeGreaterThan(180);
  });

  test("every panel link resolves", async ({ page, request }) => {
    await page.goto("/");
    const hrefs = await page.locator(".mx-panel a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) {
      const res = await request.get(href);
      expect(res.status(), href).toBeLessThan(400);
    }
  });
});

test.describe("mobile menu", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 2000) >= 1180, "mobile navigation only");

  test("burger opens fullscreen accordion with bottom actions, Escape closes, no overflow", async ({ page }) => {
    await page.goto("/");
    const burger = page.locator(".hdr__burger");
    await burger.click();
    const sheet = page.locator("#mnav");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Reise finden" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Bus anfragen" })).toBeVisible();

    const group = sheet.locator("details.mnav__group").first();
    await group.locator("summary").click();
    await expect(group).toHaveAttribute("open", "");

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(burger).toBeFocused();
  });
});
