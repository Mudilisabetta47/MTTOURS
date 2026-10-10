import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {
  // CI provides env
}

const PORT = 3100;
const e2eDb = process.env.E2E_DATABASE_URL ?? "";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDb,
      APP_URL: `http://localhost:${PORT}`,
      APP_ENV: "test",
      SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123",
      TICKET_SIGNING_SECRET: "e2e-ticket-secret-e2e-ticket-secret-01234",
      // test-only payment path: signed events to the real webhook, no Stripe API calls
      TEST_PAYMENTS: "1",
      STRIPE_SECRET_KEY: "sk_test_e2e_not_a_real_key",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_not_a_real_secret",
      // syntactically valid dummy; every Mapbox request is answered by the test (tests/e2e/mapbox-mock.ts)
      NEXT_PUBLIC_MAPBOX_TOKEN: "pk.eyJ1IjoibWV0cm9wb2wtdGVzdCIsImEiOiJ0ZXN0In0.test-signature",
    },
  },
});
