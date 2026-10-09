import type { Db } from "@/server/db/client";
import { canGrantRole, type RoleName } from "@/lib/rbac";
import { audit } from "@/server/audit";
import { randomToken, sha256Hex } from "@/server/auth/tokens";
import { normaliseEmail } from "@/server/auth/login";

export class StaffError extends Error {
  constructor(
    message: string,
    readonly code: "forbidden" | "conflict" | "last_owner" | "not_found",
  ) {
    super(message);
  }
}

export interface Actor {
  id: string;
  roles: readonly RoleName[];
}

const RESET_TTL_MS = 48 * 3600_000;

/** Create a staff/driver account without password. Returns a one-time link token to set it. */
export async function createAccount(
  db: Db,
  actor: Actor,
  input: { email: string; displayName: string; roles: RoleName[] },
): Promise<{ userId: string; setPasswordToken: string }> {
  for (const role of input.roles) {
    if (!canGrantRole(actor.roles, role)) throw new StaffError(`Rolle ${role} darf nicht vergeben werden`, "forbidden");
  }
  const email = normaliseEmail(input.email);
  const token = randomToken(32);

  return db.$transaction(async (tx) => {
    const exists = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) throw new StaffError("Für diese E-Mail-Adresse existiert bereits ein Konto", "conflict");
    const user = await tx.user.create({
      data: {
        email,
        displayName: input.displayName.trim(),
        roles: { create: input.roles.map((role) => ({ role, grantedBy: actor.id })) },
      },
    });
    await tx.passwordResetToken.create({
      data: { id: sha256Hex(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    await audit(tx, {
      actorUserId: actor.id,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      after: { email, displayName: user.displayName, roles: input.roles },
    });
    return { userId: user.id, setPasswordToken: token };
  });
}

export async function grantRole(db: Db, actor: Actor, userId: string, role: RoleName): Promise<void> {
  if (!canGrantRole(actor.roles, role)) throw new StaffError(`Rolle ${role} darf nicht vergeben werden`, "forbidden");
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new StaffError("Konto nicht gefunden", "not_found");
    await tx.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role, grantedBy: actor.id },
      update: {},
    });
    await audit(tx, { actorUserId: actor.id, action: "user.role.grant", entityType: "User", entityId: userId, after: { role } });
  });
}

export async function revokeRole(db: Db, actor: Actor, userId: string, role: RoleName): Promise<void> {
  if (!canGrantRole(actor.roles, role)) throw new StaffError(`Rolle ${role} darf nicht entzogen werden`, "forbidden");
  await db.$transaction(async (tx) => {
    if (role === "OWNER") {
      // Serialise owner changes so two concurrent revocations cannot remove the last owner.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('role:OWNER'))`;
      const owners = await tx.userRole.count({ where: { role: "OWNER", user: { isActive: true } } });
      if (owners <= 1) throw new StaffError("Der letzte Inhaber-Zugang kann nicht entfernt werden", "last_owner");
    }
    const res = await tx.userRole.deleteMany({ where: { userId, role } });
    if (res.count === 0) return;
    await tx.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(tx, { actorUserId: actor.id, action: "user.role.revoke", entityType: "User", entityId: userId, before: { role } });
  });
}

/** Consume a one-time token and set the password. Revokes all existing sessions. */
export async function setPasswordWithToken(db: Db, token: string, passwordHash: string): Promise<boolean> {
  const id = sha256Hex(token);
  return db.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) return false;
    const row = await tx.passwordResetToken.findUniqueOrThrow({ where: { id } });
    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, passwordChangedAt: new Date(), emailVerifiedAt: new Date() },
    });
    await tx.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(tx, { actorUserId: row.userId, action: "user.password.set", entityType: "User", entityId: row.userId });
    return true;
  });
}
