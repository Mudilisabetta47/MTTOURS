// Screenshots of the Destination Explorer. With MAPBOX_MOCK=1 all Mapbox requests are answered locally
// (plain background style, simulated route) – the screenshots then show our UI, not real Mapbox tiles.
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3200";
const out = "qa-shots/explorer";
const mock = process.env.MAPBOX_MOCK === "1";
const b = await chromium.launch();

async function prepare(page) {
  if (!mock) return;
  await page.route(/api\.mapbox\.com\/styles\/v1\//, (r) =>
    r.fulfill({ json: { version: 8, sources: {}, glyphs: "https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf", layers: [{ id: "bg", type: "background", paint: { "background-color": "#eef0ec" } }] } }),
  );
  await page.route(/api\.mapbox\.com\/fonts\//, (r) => r.fulfill({ status: 200, body: Buffer.alloc(0), contentType: "application/x-protobuf" }));
  await page.route(/events\.mapbox\.com/, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/api\.mapbox\.com\/map-sessions\//, (r) => r.fulfill({ status: 204, body: "" }));
  await page.route(/api\.mapbox\.com\/directions\//, (r) => {
    const m = r.request().url().match(/\/(-?[\d.]+),(-?[\d.]+);(-?[\d.]+),(-?[\d.]+)/);
    const [a, b2, c, d] = m.slice(1).map(Number);
    r.fulfill({ json: { code: "Ok", routes: [{ distance: 1234, duration: 960, geometry: { type: "LineString", coordinates: [[a, b2], [(a + c) / 2, b2], [c, d]] } }] } });
  });
}

const desk = await b.newPage({ viewport: { width: 1440, height: 900 } });
await prepare(desk);
desk.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 160)));
await desk.goto(`${BASE}/reisen/nizza#umgebung`, { waitUntil: "networkidle" });
await desk.waitForTimeout(800);
const sec = desk.locator("#umgebung");
await sec.scrollIntoViewIfNeeded();
const consent = desk.getByRole("button", { name: "Interaktive Karte laden" });
if (await consent.isVisible().catch(() => false)) await consent.click();
await desk.waitForTimeout(2500);
await sec.screenshot({ path: `${out}/nizza-desktop.png` });
await desk.locator(".dx-poi__main", { hasText: "Promenade des Anglais" }).click();
await desk.waitForTimeout(1500);
await desk.locator(".dx-body").screenshot({ path: `${out}/nizza-selected.png` });
const walk = desk.getByRole("button", { name: "Route · Zu Fuß" }).first();
if (await walk.isVisible().catch(() => false)) {
  await walk.click();
  await desk.waitForTimeout(1500);
  await desk.locator(".dx-body").screenshot({ path: `${out}/nizza-route.png` });
}
await desk.locator(".dx-chip", { hasText: "Restaurants" }).click();
await desk.waitForTimeout(1300);
await desk.locator(".dx").screenshot({ path: `${out}/nizza-food.png` });

await desk.goto(`${BASE}/reisen/lloret-de-mar#umgebung`, { waitUntil: "networkidle" });
await desk.locator(".dx-chip", { hasText: "Strände" }).click();
await desk.waitForTimeout(2200);
await desk.locator("#umgebung").screenshot({ path: `${out}/lloret-beaches.png` });

await desk.goto(`${BASE}/wochenendtrips/kopenhagen#umgebung`, { waitUntil: "networkidle" });
await desk.locator(".dx-chip", { hasText: "Sehenswürdigkeiten" }).click();
await desk.waitForTimeout(2200);
await desk.locator("#umgebung").screenshot({ path: `${out}/kopenhagen-sights.png` });

await desk.goto(`${BASE}/wochenendtrips/prag#umgebung`, { waitUntil: "networkidle" });
await desk.waitForTimeout(600);
await desk.locator("#umgebung").screenshot({ path: `${out}/prag-empty.png` }).catch(() => console.log("prag: no section"));

for (const w of [390, 430, 768, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: w < 800 ? 860 : 1080 }, isMobile: w < 800, hasTouch: w < 800 });
  await prepare(p);
  await p.goto(`${BASE}/reisen/nizza`, { waitUntil: "networkidle" });
  await p.locator("#umgebung").scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  const of = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`width ${w}: overflow ${of}`);
  if (w === 390) {
    await p.screenshot({ path: `${out}/mobile-list.png` });
    await p.getByRole("button", { name: "Karte ansehen" }).click();
    await p.waitForTimeout(400);
    const c2 = p.getByRole("button", { name: "Interaktive Karte laden" });
    if (await c2.isVisible().catch(() => false)) await c2.click();
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${out}/mobile-map.png` });
    await p.locator(".dx-full__map canvas").click({ position: { x: 150, y: 250 } }).catch(() => {});
    await p.getByRole("button", { name: "← Zur Liste" }).click();
    await p.locator(".dx-poi__main", { hasText: "Vieux Nice" }).click();
    await p.getByRole("button", { name: "Auf Karte zeigen" }).first().click().catch(() => {});
    await p.waitForTimeout(2200);
    await p.screenshot({ path: `${out}/mobile-poi.png` });
  }
  await p.close();
}
await b.close();
console.log("done");
