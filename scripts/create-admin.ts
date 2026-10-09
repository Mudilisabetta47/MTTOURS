/**
 * Bootstrap the first OWNER account (or another staff account) from the command line.
 * No password is set or printed: the script prints a one-time link to set it.
 *
 *   npm run admin:create -- --email inhaber@metours.de --name "Vorname Nachname" [--role OWNER]
 */
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { ROLES, type RoleName } from "../src/lib/rbac.ts";
import { randomToken, sha256Hex } from "../src/server/auth/tokens.ts";

try {
  process.loadEnvFile();
} catch {
  // environment provided externally
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string", default: "OWNER" },
  },
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
const role = values.role as RoleName;
if (!email || !name || !ROLES.includes(role) || role === "CUSTOMER") {
  console.error("Usage: --email <adresse> --name <Name> [--role OWNER|ADMIN|…]");
  process.exit(1);
}
if (!process.env.DATABASE_URL || !process.env.APP_URL) {
  console.error("DATABASE_URL and APP_URL must be set");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

try {
  const token = randomToken(32);
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, displayName: name },
      update: {},
    });
    await tx.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: { userId: user.id, role, grantedBy: "cli" },
      update: {},
    });
    await tx.passwordResetToken.create({
      data: { id: sha256Hex(token), userId: user.id, expiresAt: new Date(Date.now() + 48 * 3600_000) },
    });
    await tx.auditLog.create({
      data: { actorLabel: "cli:create-admin", action: "user.role.grant", entityType: "User", entityId: user.id, after: { role } },
    });
  });
  console.log(`Konto ${email} (${role}) bereit.`);
  console.log(`Einmal-Link (48 Std.): ${process.env.APP_URL}/passwort-setzen?token=${encodeURIComponent(token)}`);
} finally {
  await db.$disconnect();
}
