import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const accounts = () =>
  JSON.parse(readFileSync("test-results/e2e-accounts.json", "utf8")) as Record<"owner" | "driver", { email: string; password: string }>;

async function login(page: Page, who: "owner" | "driver") {
  const a = accounts()[who];
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill(a.email);
  await page.getByLabel("Passwort").fill(a.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/anmelden"));
}

/** Compare against the emulated device width: mobile browsers widen the layout viewport when content overflows. */
async function expectNoOverflow(page: Page) {
  const device = page.viewportSize()!.width;
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(inner).toBe(device);
  expect(scroll).toBeLessThanOrEqual(device);
}

test("health endpoint reports database without leaking details", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ status: "ok", database: "up" });
  expect(JSON.stringify(body)).not.toMatch(/postgres|password|secret/i);
});

test("staging is not indexable", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /");
});

test("admin requires login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/anmelden/);
  await expect(page.getByRole("heading", { name: "Anmelden" })).toBeVisible();
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/anmelden");
  await page.getByLabel("E-Mail-Adresse").fill("owner@e2e.test");
  await page.getByLabel("Passwort").fill("definitiv falsch");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.locator(".alert--danger")).toContainText("nicht korrekt");
});

test("owner sees real (empty) dashboard figures and system modules", async ({ page }, info) => {
  await login(page, "owner");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Fahrten heute")).toBeVisible();
  // computed from the seeded test departures – a real figure, never a placeholder number
  await expect(page.getByText(/\d+ von \d+ Plätzen/)).toBeVisible();
  const nav = page.getByRole("complementary", { name: "Hauptnavigation" });
  // grouped like the previous metours admin
  await expect(nav.getByRole("link", { name: "Benutzer & Rollen" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Audit-Log" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reise-Buchungen" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Reisen", exact: true })).toBeVisible();
  // unbuilt modules are not shown as dead links
  await expect(nav.getByRole("link", { name: "Destinationen" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Tickets" })).toHaveCount(0);
  await page.screenshot({ path: `test-results/screens/dashboard-${info.project.name}.png`, fullPage: true });

  const cookies = await page.context().cookies();
  const session = cookies.find((c) => c.name.endsWith("mt_session"));
  expect(session?.httpOnly).toBe(true);
  expect(session?.sameSite).toBe("Lax");
});

test("owner creates a driver account and the action is audited", async ({ page }, info) => {
  await login(page, "owner");
  await page.goto("/admin/mitarbeiter");
  const email = `neu-${info.project.name}@e2e.test`;
  await page.getByLabel("Name").fill("Neuer Fahrer");
  await page.getByLabel("E-Mail").fill(email);
  await page.getByLabel("Fahrer").check();
  await page.getByRole("button", { name: "Konto anlegen" }).click();
  await expect(page.getByText(`Konto für ${email} angelegt.`)).toBeVisible();
  const link = await page.locator("code").filter({ hasText: "/passwort-setzen?token=" }).innerText();

  await page.goto("/admin/protokoll?action=user.create");
  await expect(page.getByRole("cell", { name: "user.create" }).first()).toBeVisible();

  // the one-time link works exactly once
  const ctx = await page.context().browser()!.newContext();
  const p2 = await ctx.newPage();
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, info.project.use.baseURL ?? ""));
  await p2.getByLabel("Neues Passwort").fill("Ein gutes neues Passwort 1");
  await p2.getByLabel("Passwort wiederholen").fill("Ein gutes neues Passwort 1");
  await p2.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(p2.getByText("Passwort gespeichert.")).toBeVisible();
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, info.project.use.baseURL ?? ""));
  await p2.getByLabel("Neues Passwort").fill("Noch ein anderes Passwort 2");
  await p2.getByLabel("Passwort wiederholen").fill("Noch ein anderes Passwort 2");
  await p2.getByRole("button", { name: "Passwort speichern" }).click();
  await expect(p2.locator(".alert--danger")).toContainText("bereits verwendet");
  await ctx.close();
});

test("a driver lands in the driver area and cannot open the back office", async ({ page }) => {
  await login(page, "driver");
  await expect(page).toHaveURL(/\/fahrer$/);
  // the e2e driver has a profile and one assigned run (live-tracking fixture)
  await expect(page.getByRole("link", { name: "E2E Testreise Nizza" })).toBeVisible();
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(403);
  await expect(page.getByRole("heading", { name: "Keine Berechtigung" })).toBeVisible();
});

test("no horizontal overflow on login page", async ({ page }, info) => {
  await page.goto("/anmelden");
  await expectNoOverflow(page);
  await page.screenshot({ path: `test-results/screens/login-${info.project.name}.png` });
});

for (const path of ["/admin", "/admin/mitarbeiter", "/admin/protokoll"]) {
  test(`no horizontal overflow on ${path}`, async ({ page }, info) => {
    await login(page, "owner");
    await page.goto(path);
    await expectNoOverflow(page);
    await page.screenshot({ path: `test-results/screens/page${path.replace(/\//g, "-")}-${info.project.name}.png`, fullPage: true });
  });
}
