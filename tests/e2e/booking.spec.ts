import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Acceptance test of the booking path with test data in the e2e database only:
 * trip page → date → pickup → travellers → tariff → extra → server price → checkout → data →
 * test payment (signed webhook) → booking confirmed in DB → visible in admin.
 */
const accounts = () => JSON.parse(readFileSync("test-results/e2e-accounts.json", "utf8")) as Record<"owner", { email: string; password: string }>;
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

test("book a trip end to end with server-side price and test payment", async ({ page }) => {
  await page.goto("/reisen/e2e-testreise");
  await expect(page.getByRole("heading", { level: 1, name: "E2E Testreise Nizza" })).toBeVisible();
  // expired date is not offered, the bookable one is
  await expect(page.locator(".tdate")).toHaveCount(1);

  if (isMobile(page)) {
    await expect(page.locator(".tbk-bar")).toContainText("ab");
    await page.getByRole("button", { name: "Verfügbarkeit prüfen" }).click();
    await expect(page.locator('.tbk[data-sheet="open"]')).toBeVisible();
  }
  const card = page.locator(".tbk__card");
  const total = card.locator(".tbk__total strong");

  // default: recommended tariff, first pickup, 2 travellers → 2 × 229 €
  await expect(card.locator(".tbk__total small")).toHaveText("vom System bestätigt");
  await expect(total).toHaveText(/458,00\s€/);

  await card.getByRole("button", { name: /Zustieg/ }).click();
  await card.getByText("Testhalt Bremen ZOB").click();
  await card.getByRole("button", { name: /Tarif/ }).click();
  await card.locator(".tbk__fare", { hasText: "Basic" }).click();
  await card.getByRole("button", { name: /Extras/ }).click();
  await card.getByText("Testversicherung").click();

  // 2 × 199 + 2 × 10 (Bremen) + 2 × 25 (extra) = 468 €, confirmed by the server
  await expect(total).toHaveText(/468,00\s€/);
  await expect(card.locator(".tbk__lines")).toContainText("Zustieg Testhalt Bremen ZOB");
  await expect(card.locator(".tbk__total small")).toHaveText("vom System bestätigt");

  await card.getByRole("button", { name: "Jetzt buchen" }).click();
  await page.waitForURL(/\/buchung\/E2E-NIZZA-1\?/);
  await expect(page.locator("#bk-fare")).toHaveValue("BASIC");
  await expect(page.locator("#bk-count")).toHaveValue("2");
  await expect(page.locator(".bk__total strong")).toHaveText(/468,00\s€/);

  for (const i of [0, 1]) {
    await page.locator(`#p${i}f`).fill(`Test${i}`);
    await page.locator(`#p${i}l`).fill("Reisende");
  }
  await page.locator("#c-firstName").fill("Erika");
  await page.locator("#c-lastName").fill("Test");
  await page.locator("#c-email").fill(`e2e-${test.info().project.name}@example.org`);
  await page.locator("#c-phone").fill("0511 000000");
  // tick the boxes – the texts contain links to the legal documents
  for (const t of ["Reise- und Beförderungsbedingungen", "Datenschutzhinweise", "Formblatt zur Unterrichtung über Pauschalreisen"]) {
    await page.locator("label.choice", { hasText: t }).locator('input[type="checkbox"]').check();
  }
  await page.getByRole("button", { name: "Zahlungspflichtig buchen" }).click();

  await page.waitForURL(/\/buchung\/testzahlung/);
  await expect(page.getByText("Testumgebung – es fließt kein Geld")).toBeVisible();
  await page.getByRole("button", { name: "Testzahlung erfolgreich" }).click();

  await page.waitForURL(/\/buchung\/status/);
  await expect(page.getByRole("heading", { name: "Ihre Buchung ist bestätigt." })).toBeVisible();
  await expect(page.locator(".ticket__qr")).toHaveCount(2);

  // visible in the admin
  const a = accounts().owner;
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(a.email);
  await page.getByLabel("Passwort").fill(a.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/anmelden"));
  await page.goto("/admin/buchungen");
  const row = page.locator("tr", { hasText: `e2e-${test.info().project.name}@example.org` });
  await expect(row).toContainText("bestätigt");
  await expect(row).toContainText("E2E Testreise Nizza");
  await expect(row).toContainText(/468,00\s€/);
});

test("sold out and dateless trips never offer checkout", async ({ page }) => {
  await page.goto("/wochenendtrips/e2e-ausgebucht");
  await expect(page.locator(".tdate")).toContainText("Ausgebucht");
  await expect(page.getByRole("button", { name: "Jetzt buchen" })).toHaveCount(0);
  await expect(page.locator(".tbk__pill")).toHaveText("Ausgebucht");

  await page.goto("/wochenendtrips/e2e-ohne-termine");
  await expect(page.locator(".tbk__pill")).toHaveText("Neue Termine in Planung");
  await expect(page.getByRole("button", { name: "Über neue Termine informieren" })).toHaveCount(1);

  // direct links cannot bypass it
  await page.goto("/buchung/E2E-VOLL-1");
  await expect(page.getByRole("heading", { name: "Dieser Termin ist ausgebucht." })).toBeVisible();
  await page.goto("/buchung/E2E-NIZZA-ALT");
  await expect(page.getByRole("heading", { name: "Für diesen Termin ist keine Online-Buchung möglich." })).toBeVisible();
});

test("a manipulated tariff in the link falls back to a valid one", async ({ page }) => {
  await page.goto("/buchung/E2E-NIZZA-1?tarif=GRATIS&personen=99");
  await expect(page.locator("#bk-fare")).toHaveValue("SMART");
  const n = Number(await page.locator("#bk-count").inputValue());
  expect(n).toBeGreaterThanOrEqual(1);
  expect(n).toBeLessThanOrEqual(10);
});
