/** Full-page screenshots of given paths at desktop and mobile. node scripts/qa/pages.mjs <base> <out> /a /b … */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const [base = "http://localhost:3200", out = "test-results/pages", ...paths] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const vp of [{ n: "1440", w: 1440, h: 900, m: false }, { n: "390", w: 390, h: 844, m: true }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, isMobile: vp.m, hasTouch: vp.m, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await page.screenshot({ path: `${out}/${vp.n}${p.replace(/\//g, "_")}.png`, fullPage: true });
    console.log(`[${vp.n}] ${p} overflow=${overflow}`);
  }
  if (errors.length) console.log("errors:", errors.slice(0, 5));
  await ctx.close();
}
await browser.close();
