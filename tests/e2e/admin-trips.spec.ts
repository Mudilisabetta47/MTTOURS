import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const owner = () => (JSON.parse(readFileSync("test-results/e2e-accounts.json", "utf8")) as Record<"owner", { email: string; password: string }>).owner;

test("trip admin: edit accommodation and see it on the public page", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "one run is enough – it changes shared test data");
  const a = owner();
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(a.email);
  await page.getByLabel("Passwort").fill(a.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/anmelden"));

  await page.goto("/admin/reisen");
  await page.getByRole("link", { name: "E2E Testreise Nizza" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Testreise Nizza" })).toBeVisible();

  await page.getByRole("link", { name: "Termine & Preise" }).click();
  await expect(page.locator(".adm-dep").first()).toContainText("E2E-NIZZA-1");
  await expect(page.locator(".adm-dep").first()).toContainText("im Verkauf");

  await page.getByRole("link", { name: "Unterkunft" }).click();
  await page.getByLabel("Hotelname").fill("Testhotel Promenade");
  await page.getByLabel("Sterne (1–5)").fill("3");
  await page.getByRole("button", { name: "Unterkunft speichern" }).click();
  await expect(page.getByText("Unterkunft gespeichert.")).toBeVisible();

  // capacity is saved through the same guarded service (below sold seats is covered by the DB tests)
  await page.getByRole("link", { name: "Termine & Preise" }).click();
  await page.locator(".adm-dep").first().locator('input[name="capacity"]').fill("6");
  await page.locator(".adm-dep").first().getByRole("button", { name: "Ändern" }).click();
  await expect(page.locator(".alert--ok")).toHaveText("Plätze geändert.");

  await page.goto("/reisen/e2e-testreise");
  await expect(page.locator("#hotel")).toContainText("Testhotel Promenade");
});
