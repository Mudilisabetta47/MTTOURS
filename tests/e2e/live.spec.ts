import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const accounts = () => JSON.parse(readFileSync("test-results/e2e-accounts.json", "utf8")) as Record<"owner" | "driver", { email: string; password: string }>;
const live = () => JSON.parse(readFileSync("test-results/e2e-live.json", "utf8")) as { runId: string; orderId: string; token: string };

test("live tracking: driver shares the position, the customer and the control room see it", async ({ browser, baseURL }) => {
  // phone-only flow; one run is enough because it changes the run state
  test.skip(test.info().project.name !== "mobile", "runs once, on the phone project");
  const fx = live();
  const statusUrl = `/buchung/status?o=${encodeURIComponent(fx.orderId)}&t=${encodeURIComponent(fx.token)}`;

  // customer before the run starts
  const customer = await browser.newContext({ baseURL });
  const c = await customer.newPage();
  await c.goto(statusUrl);
  await expect(c.getByText("Sobald Ihr Fahrer die Fahrt startet")).toBeVisible();

  // driver phone near Bremen ZOB-like coordinates (test data)
  const phone = await browser.newContext({ baseURL, geolocation: { latitude: 53.2, longitude: 9.1, accuracy: 15 }, permissions: ["geolocation"], viewport: { width: 390, height: 844 } });
  const d = await phone.newPage();
  await d.goto("/anmelden");
  await d.getByLabel("E-Mail-Adresse").fill(accounts().driver.email);
  await d.getByLabel("Passwort").fill(accounts().driver.password);
  await d.getByRole("button", { name: "Anmelden" }).click();
  await d.waitForURL((u) => !u.pathname.startsWith("/anmelden"));
  await d.goto("/fahrer");
  await d.getByRole("link", { name: "E2E Testreise Nizza" }).click();
  await d.getByRole("button", { name: "Fahrt starten und Standort teilen" }).click();
  await expect(d.getByText("Standort wird gesendet")).toBeVisible({ timeout: 20_000 });

  // customer sees the bus
  await c.reload();
  await expect(c.locator('.live[data-state="live"]')).toBeVisible({ timeout: 20_000 });
  await expect(c.getByText("Ihr Bus ist unterwegs")).toBeVisible();
  await expect(c.getByText("Luftlinie zum Zustieg")).toBeVisible();
  await expect(c.locator(".live__dist strong")).toHaveText(/km$/);

  // a wrong token sees nothing
  const res = await c.request.get(`/api/live?o=${fx.orderId}&t=falsch`);
  expect(await res.json()).toEqual({ state: "none" });

  // control room
  const office = await browser.newContext({ baseURL });
  const o = await office.newPage();
  await o.goto("/anmelden");
  await o.getByLabel("E-Mail-Adresse").fill(accounts().owner.email);
  await o.getByLabel("Passwort").fill(accounts().owner.password);
  await o.getByRole("button", { name: "Anmelden" }).click();
  await o.waitForURL((u) => !u.pathname.startsWith("/anmelden"));
  await o.goto("/admin/leitstelle");
  const row = o.locator("tr", { hasText: "F-E2E-00001" });
  await expect(row).toContainText("unterwegs");
  await expect(row).toContainText("live");

  // driver ends the run → customer sees the end, no more position
  await d.getByRole("button", { name: "Fahrt beenden" }).click();
  await expect(d.getByText("Diese Fahrt ist beendet.")).toBeVisible();
  await c.reload();
  await expect(c.getByText("Die Fahrt ist beendet.")).toBeVisible();

  await Promise.all([customer.close(), phone.close(), office.close()]);
});
