// Screenshots of the rebuilt trip pages (desktop + mobile, gallery, booking card, sheet).
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3200";
const out = "test-results/trip";
const b = await chromium.launch();
const desk = await b.newPage({ viewport: { width: 1440, height: 900 } });

await desk.goto(`${BASE}/reisen/lloret-de-mar`, { waitUntil: "networkidle" });
await desk.waitForTimeout(1200);
await desk.screenshot({ path: `${out}/02-lloret-hero.png` });
await desk.screenshot({ path: `${out}/02-lloret-full.png`, fullPage: true });
await desk.locator(".gal__all").click();
await desk.waitForTimeout(600);
await desk.screenshot({ path: `${out}/03-lightbox.png` });
await desk.keyboard.press("Escape");

await desk.goto(`${BASE}/wochenendtrips/kopenhagen`, { waitUntil: "networkidle" });
await desk.waitForTimeout(1500);
await desk.screenshot({ path: `${out}/05-kopenhagen-card.png` });
await desk.locator(".tbk__head", { hasText: "Tarif" }).click().catch(() => {});
await desk.waitForTimeout(900);
await desk.locator(".tbk").screenshot({ path: `${out}/04-tariff.png` });
await desk.locator(".tbk__head", { hasText: "Zustieg" }).click().catch(() => {});
await desk.waitForTimeout(900);
await desk.locator(".tbk").screenshot({ path: `${out}/07-pickup.png` });
await desk.screenshot({ path: `${out}/05-kopenhagen-full.png`, fullPage: true });

await desk.goto(`${BASE}/reisen/nizza`, { waitUntil: "networkidle" });
await desk.waitForTimeout(1200);
await desk.screenshot({ path: `${out}/10-nizza.png` });

const mob = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await mob.goto(`${BASE}/wochenendtrips/kopenhagen`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: `${out}/08-mobile.png` });
await mob.locator(".tbk-bar .btn").click();
await mob.waitForTimeout(900);
await mob.screenshot({ path: `${out}/09-mobile-sheet.png` });
await mob.goto(`${BASE}/reisen/lloret-de-mar`, { waitUntil: "networkidle" });
await mob.waitForTimeout(1200);
await mob.screenshot({ path: `${out}/08-mobile-lloret.png` });
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("mobile overflow", overflow);
await b.close();
console.log("done");
