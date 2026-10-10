// Captures the old Lovable trip pages for the before/after comparison (read-only, declines cookies).
import { chromium } from "@playwright/test";
const pages = [
  ["lloret", "https://www.metours.de/reisen/lloret-de-mar-sonne-strand-sorglos-reisen"],
  ["nizza", "https://www.metours.de/reisen/nizza"],
];
const browser = await chromium.launch();
for (const [name, url] of pages) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: "networkidle" });
  const decline = page.getByRole("button", { name: /^Ablehnen/ });
  if (await decline.isVisible().catch(() => false)) await decline.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `test-results/trip/01-lovable-${name}.png`, fullPage: true });
  await page.screenshot({ path: `test-results/trip/01-lovable-${name}-top.png` });
  console.log(name, (await page.innerText("main").catch(() => "")).slice(0, 3000).replace(/\n+/g, " | "));
  await page.close();
}
await browser.close();
