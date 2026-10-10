import { createHash } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function scrollToTrackProgress(page: Page, selector: string, p: number) {
  await page.evaluate(
    ({ selector, p }) => {
      const el = document.querySelector(selector)!;
      const r = el.getBoundingClientRect();
      window.scrollTo(0, Math.round(r.top + window.scrollY + (r.height - window.innerHeight) * p));
    },
    { selector, p },
  );
  await page.waitForTimeout(350);
  return page.evaluate(() => window.scrollY);
}

async function canvasHash(page: Page) {
  const data = await page.evaluate(() => (document.querySelector(".journey__canvas") as HTMLCanvasElement).toDataURL("image/png"));
  return createHash("sha256").update(data).digest("hex");
}

test("homepage is server-rendered with real metadata and no invented ratings", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html).toContain("<title>Busreisen &amp; Bus mieten ab Hannover, Bremen und Hamburg | METROPOL TOURS</title>");
  expect(html).toContain('aria-label="Europa wartet. Wir fahren."');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain('"@type":"TravelAgency"');
  expect(html).not.toMatch(/AggregateRating|ratingValue|Bestpreis|12\.000 Reisende/);
});

test("hero offers both paths and the search reaches real targets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Europa wartet. Wir fahren." })).toBeVisible();
  await expect(page.locator(".hero").getByRole("link", { name: "Reise finden" })).toBeVisible();
  await expect(page.locator(".hero").getByRole("link", { name: "Bus mieten" })).toBeVisible();

  await page.getByRole("tab", { name: "Reise finden" }).click();
  await page.locator("#s-ziel").selectOption("nizza");
  await page.getByRole("button", { name: "Reisen anzeigen" }).click();
  await expect(page).toHaveURL(/\/reisen\?ziel=nizza/);
  await expect(page.getByText("Für diese Auswahl gibt es gerade keinen buchbaren Termin.")).toBeVisible();
});

test("no empty trip list pretends availability", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Aktuell ist kein Reisetermin online buchbar.")).toBeVisible();
});

test("the bus journey is deterministic: same scroll position, same frame", async ({ page }) => {
  await page.goto("/");
  // Approach the same position from different directions: the frame must not depend on scroll history.
  await scrollToTrackProgress(page, ".journey__track", 0.2);
  const ya = await scrollToTrackProgress(page, ".journey__track", 0.47);
  const a = await canvasHash(page);
  await scrollToTrackProgress(page, ".journey__track", 0.9);
  const b = await canvasHash(page);
  const yc = await scrollToTrackProgress(page, ".journey__track", 0.47);
  const c = await canvasHash(page);
  expect(yc).toBe(ya);
  expect(a).toBe(c);
  expect(a).not.toBe(b);
  await expect(page.locator(".journey__act").nth(3)).toHaveCSS("opacity", "1");
});

test("reduced motion shows all statements without scroll films", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const trackHeight = await page.evaluate(() => document.querySelector(".journey__track")!.getBoundingClientRect().height);
  expect(trackHeight).toBeLessThan(2000);
  await expect(page.locator(".journey__static")).toBeVisible();
  await ctx.close();
});

test("bus rental inquiry is validated, stored and confirmed with a number", async ({ page }) => {
  await page.goto("/bus-mieten?anlass=verein&personen=42#anfrage");
  await expect(page.locator("#anlass")).toHaveValue("verein");
  await expect(page.locator("#personen")).toHaveValue("42");

  // server-side validation keeps the input
  await page.locator("#start").fill("Vereinsheim, Hannover-Linden");
  await page.waitForTimeout(2700); // time trap
  await page.getByRole("button", { name: "Angebot anfordern" }).click();
  await expect(page.getByText("Bitte prüfen Sie die markierten Felder.")).toBeVisible();
  await expect(page.locator("#start")).toHaveValue("Vereinsheim, Hannover-Linden");

  const future = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  await page.locator("#datum").fill(future);
  await page.locator("#ziel").fill("Sportpark Bremen");
  await page.locator("#name").fill("E2E Verein");
  await page.locator("#email").fill(`verein-${Date.now()}@e2e.test`);
  await page.getByLabel(/Ich bin einverstanden/).check();
  await page.getByRole("button", { name: "Angebot anfordern" }).click();
  await expect(page.getByText("Danke. Ihre Anfrage ist bei uns.")).toBeVisible();
  await expect(page.getByText(/ANF-\d{4}-\d{5}/)).toBeVisible();
});

test("legal notice is reachable and every internal homepage link resolves", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.$$eval("a[href^='/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")!.split("#")[0]!))]);
  for (const href of hrefs) {
    const res = await request.get(href || "/");
    expect(res.status(), href).toBeLessThan(400);
  }
  await page.goto("/impressum");
  await expect(page.getByText("HRB 222247")).toBeVisible();
});
