/** Screenshots of every mega menu (desktop) and the mobile sheet. node scripts/qa/mega.mjs <base> <out> */
import { chromium } from "@playwright/test";
const [base = "http://localhost:3200", out = "test-results/pages"] = process.argv.slice(2);
const browser = await chromium.launch();
for (const w of [1440, 1920]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  for (const name of ["Reisen", "Bus mieten", "Gruppen", "Service", "Über uns"]) {
    await page.locator(".hdr__trigger", { hasText: name }).first().click();
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${out}/mega-${w}-${name.replace(/\s/g, "-")}.png` });
  }
  await page.keyboard.press("Escape");
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/hdr-scrolled-${w}.png`, clip: { x: 0, y: 0, width: w, height: 140 } });
}
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await m.goto(base + "/", { waitUntil: "networkidle" });
await m.getByRole("button", { name: "Menü öffnen" }).click();
await m.waitForTimeout(400);
await m.locator(".mnav__group summary", { hasText: "Reisen" }).click();
await m.waitForTimeout(350);
await m.screenshot({ path: `${out}/mnav-390.png` });
await browser.close();
