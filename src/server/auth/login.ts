import type { Db } from "@/server/db/client";
import { isStaff, type RoleName } from "@/lib/rbac";
import { audit } from "@/server/audit";
import { hitRateLimit, peekRateLimit } from "@/server/rate-limit";

const ACCOUNT_FAILURES_MAX = 8;
const WINDOW_S = 15 * 60;
import { verifyPassword } from "./password";
import { createSession, CUSTOMER_SESSION_DAYS, STAFF_SESSION_HOURS } from "./session-store";

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; roles: RoleName[] }
  | { ok: false; reason: "invalid" | "rate_limited" };

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Password login. Deliberately terse failure reasons: the caller shows one generic message.
 */
export async function loginWithPassword(
  db: Db,
  input: { email: string; password: string; ipHash: string | null; userAgent: string | null },
): Promise<LoginResult> {
  const email = normaliseEmail(input.email);

  // Per account only failures count (a legitimate user is never locked out by logging in often);
  // per IP every attempt counts.
  const accountKey = `login:fail:${email}`;
  const failures = await peekRateLimit(db, accountKey, WINDOW_S);
  const perIp = input.ipHash ? await hitRateLimit(db, `login:ip:${input.ipHash}`, 30, WINDOW_S) : null;
  if (failures >= ACCOUNT_FAILURES_MAX || (perIp && !perIp.allowed)) {
    await audit(db, { actorLabel: "auth", action: "auth.login.rate_limited", entityType: "User", entityId: email, ipHash: input.ipHash });
    return { ok: false, reason: "rate_limited" };
  }

  const user = await db.user.findUnique({ where: { email }, include: { roles: true } });
  const valid = await verifyPassword(user?.passwordHash, input.password);
  if (!user || !valid || !user.isActive) {
    await hitRateLimit(db, accountKey, ACCOUNT_FAILURES_MAX, WINDOW_S);
    await audit(db, {
      actorLabel: "auth",
      action: "auth.login.failed",
      entityType: "User",
      entityId: user?.id ?? email,
      ipHash: input.ipHash,
    });
    return { ok: false, reason: "invalid" };
  }

  const roles = user.roles.map((r) => r.role as RoleName);
  const lifetimeMs = isStaff(roles) || roles.includes("DRIVER")
    ? STAFF_SESSION_HOURS * 3600_000
    : CUSTOMER_SESSION_DAYS * 86400_000;

  const { token, expiresAt } = await createSession(db, user.id, { lifetimeMs, userAgent: input.userAgent, ipHash: input.ipHash });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit(db, { actorUserId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ipHash: input.ipHash });
  return { ok: true, token, expiresAt, roles };
}
