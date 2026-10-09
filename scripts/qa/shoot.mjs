/**
 * Screenshots at defined scroll positions (HANDOVER: shoot-at).
 *   node scripts/qa/shoot.mjs http://localhost:3200 out-dir
 * Positions are fractions of a section's scroll track, so film frames are reproducible.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3200";
const out = process.argv[3] ?? "test-results/shots";
mkdirSync(out, { recursive: true });

const viewports = [
  { name: "1440", width: 1440, height: 900, isMobile: false },
  { name: "390", width: 390, height: 844, isMobile: true },
];

const targets = [
  { name: "hero", sel: ".hero", at: 0 },
  { name: "search", sel: "#suche", at: -0.15 },
  { name: "trips", sel: ".trips__empty, .trips__grid", at: -0.3 },
  ...[0.02, 0.18, 0.32, 0.47, 0.64, 0.8, 0.96].map((p, i) => ({ name: `journey-${i + 1}`, sel: ".journey__track", track: p })),
  { name: "window-mid", sel: ".window__track", track: 0.45 },
  { name: "rail-0", sel: ".rail__track", track: 0.02 },
  { name: "rail-60", sel: ".rail__track", track: 0.6 },
  { name: "rental", sel: ".rental__grid", at: -0.4 },
  { name: "fleet-80", sel: ".fleet__track", track: 0.8 },
  { name: "paths", sel: ".paths", at: -0.2 },
  { name: "route", sel: "#abfahrtsorte", at: 0.25 },
  { name: "trust", sel: ".facts", at: -0.3 },
  { name: "final", sel: ".final", at: -0.4 },
  { name: "footer", sel: "bottom" },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.isMobile, hasTouch: vp.isMobile, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  for (const t of targets) {
    const y = await page.evaluate((t) => {
      if (t.sel === "bottom") return document.documentElement.scrollHeight;
      const el = document.querySelector(t.sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      if (t.track !== undefined) return top + (r.height - window.innerHeight) * t.track;
      return top + window.innerHeight * (t.at ?? 0);
    }, t);
    if (y === null) {
      console.log(`[${vp.name}] missing ${t.sel}`);
      continue;
    }
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/${vp.name}-${t.name}.png` });
  }
  console.log(`[${vp.name}] overflow=${overflow} errors=${errors.length}${errors.length ? "\n  " + errors.slice(0, 5).join("\n  ") : ""}`);
  await ctx.close();
}
await browser.close();
