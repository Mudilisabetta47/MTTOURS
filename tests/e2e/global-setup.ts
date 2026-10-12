import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { hashPassword } from "../../src/server/auth/password.ts";
import { assertTestDatabase } from "../db/safety.ts";
import { createHash } from "node:crypto";
import { seedE2eCatalog, seedE2eLive } from "./seed.ts";

/** Fresh e2e database with two accounts whose random passwords are handed to the specs via a git-ignored file. */
export default async function globalSetup() {
  try {
    process.loadEnvFile();
  } catch {
    // CI
  }
  const url = assertTestDatabase(process.env.E2E_DATABASE_URL);
  execFileSync("npx", ["prisma", "migrate", "reset", "--force"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "e2e test database reset" },
  });
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const accounts = {
    owner: { email: "owner@e2e.test", password: `Owner ${randomBytes(9).toString("base64url")}` },
    driver: { email: "fahrer@e2e.test", password: `Fahrer ${randomBytes(9).toString("base64url")}` },
  };
  try {
    await db.user.create({
      data: { email: accounts.owner.email, displayName: "E2E Inhaber", passwordHash: await hashPassword(accounts.owner.password), roles: { create: [{ role: "OWNER" }] } },
    });
    const driverUser = await db.user.create({
      data: { email: accounts.driver.email, displayName: "E2E Fahrer", passwordHash: await hashPassword(accounts.driver.password), roles: { create: [{ role: "DRIVER" }] } },
    });
    await seedE2eCatalog(db);
    const liveToken = randomBytes(24).toString("base64url");
    const live = await seedE2eLive(db, driverUser.id, createHash("sha256").update(liveToken).digest("hex"));
    mkdirSync("test-results", { recursive: true });
    writeFileSync("test-results/e2e-live.json", JSON.stringify({ ...live, token: liveToken }));
  } finally {
    await db.$disconnect();
  }
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/e2e-accounts.json", JSON.stringify(accounts));
}
