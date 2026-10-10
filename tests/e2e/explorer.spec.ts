import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { mockMapbox } from "./mapbox-mock";

test("destination explorer: SEO content without map, filters, consent, markers, popup, route", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const calls = await mockMapbox(page);

  // server-rendered, crawlable content – the map is optional
  const html = await (await page.request.get("/reisen/e2e-testreise")).text();
  expect(html).toContain("Entdecke dein Reiseziel.");
  expect(html).toContain("Sehenswürdigkeiten in Nizza");
  expect(html).toContain("Promenade des Anglais");
  expect(html).not.toContain("Ungeprüfter Ort");
  expect(html).not.toContain("Ausgeblendeter Ort");
  expect(html).not.toContain("api.mapbox.com");

  await page.goto("/reisen/e2e-testreise");
  await page.getByRole("link", { name: "Umgebung" }).click();
  await expect(page.locator("#umgebung")).toBeInViewport();
  // heading must not hide under header + section tabs
  const top = await page.locator("#h-umgebung").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThan(110);

  // distances are labelled as straight-line, with a named reference point
  await expect(page.locator(".dx-origin-note")).toContainText("Luftlinie ab Stadtzentrum (Place Masséna)");
  await expect(page.locator(".dx-poi").first().locator(".dx-poi__dist")).toContainText("Luftlinie");

  // nothing is requested from Mapbox before consent
  const mobile = (page.viewportSize()?.width ?? 0) <= 900;
  expect(await page.locator(".mapboxgl-canvas").count()).toBe(0);

  // category filter
  await page.locator(".dx-chip", { hasText: "Restaurants" }).click();
  await expect(page.locator(".dx-poi")).toHaveCount(1);
  await expect(page.locator(".dx-poi")).toContainText("Testcafé");
  await page.locator(".dx-chip", { hasText: "Alle" }).click();
  await expect(page.locator(".dx-poi")).toHaveCount(5);

  if (mobile) {
    await page.getByRole("button", { name: "Karte ansehen" }).click();
    await page.getByRole("button", { name: "Interaktive Karte laden" }).click();
    await expect(page.locator(".dx-full .mapboxgl-canvas")).toBeVisible();
    await page.getByRole("button", { name: "← Zur Liste" }).click();
    await expect(page.locator(".dx-full")).toHaveCount(0);
  } else {
    await page.getByRole("button", { name: "Interaktive Karte laden" }).click();
    await expect(page.locator(".dx-map .mapboxgl-canvas")).toBeVisible();
    await expect(page.locator(".dx")).toHaveAttribute("data-map", "ready");
  }

  // list → selection → popup (desktop) / detail card (mobile)
  await page.locator(".dx-poi__main", { hasText: "Cours Saleya" }).click();
  await expect(page.locator('.dx-poi[data-on="true"]')).toContainText("Cours Saleya");
  if (!mobile) await expect(page.locator(".mapboxgl-popup")).toContainText("Cours Saleya");

  // route is requested from the configured origin to the place, walking profile
  await page.getByRole("button", { name: "Route · Zu Fuß" }).first().click();
  await expect.poll(() => calls.directions.length).toBe(1);
  expect(calls.directions[0]).toMatch(/directions\/v5\/mapbox\/walking\/7\.2703,43\.6969;7\.2755,43\.6955/);
  await expect(page.getByText(/Zu Fuß: 1,2 km · ca\. 16 Min\./).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test("a guide without places shows an honest empty state", async ({ page }) => {
  await page.goto("/wochenendtrips/e2e-ohne-termine");
  await expect(page.getByText("Der Ortsführer für Leerstadt entsteht gerade.")).toBeVisible();
  await expect(page.locator(".dx")).toHaveCount(0);
});

test("editors see the destination with review state, sources and preview", async ({ page }) => {
  const a = (JSON.parse(readFileSync("test-results/e2e-accounts.json", "utf8")) as Record<"owner", { email: string; password: string }>).owner;
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(a.email);
  await page.getByLabel("Passwort").fill(a.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/anmelden"));
  await page.goto("/admin/destinationen");
  await expect(page.getByRole("link", { name: "Nizza" })).toBeVisible();
  await page.getByRole("link", { name: "Nizza" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nizza" })).toBeVisible();
  await expect(page.locator("tr", { hasText: "Ungeprüfter Ort" })).toContainText("zu prüfen");
  await expect(page.locator("tr", { hasText: "Ungeprüfter Ort" }).getByRole("button", { name: "Freigeben" })).toBeVisible();
  await expect(page.getByText("5 öffentlich")).toBeVisible();
  await page.screenshot({ path: `qa-shots/admin-destination-${test.info().project.name}.png`, fullPage: true });
});
