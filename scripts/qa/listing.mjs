// Screenshots of the listing landing pages (desktop + mobile).
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3200";
const out = process.env.OUT ?? "qa-shots/listing";
const b = await chromium.launch();
for (const [w, h, tag] of [[1440, 900, "d"], [390, 844, "m"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: tag === "m" });
  for (const path of ["/pauschalreisen", "/wochenendtrips", "/reisen"]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/${path.slice(1)}-${tag}.png`, fullPage: tag === "d" });
  }
  await p.close();
}
await b.close();
console.log("done");
