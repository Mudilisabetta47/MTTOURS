import type { Db } from "@/server/db/client";
import type { RoleName } from "@/lib/rbac";
import { randomToken, sha256Hex } from "./tokens";

export const STAFF_SESSION_HOURS = 12;
export const CUSTOMER_SESSION_DAYS = 30;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: RoleName[];
  sessionId: string;
  mfaVerified: boolean;
}

export async function createSession(
  db: Db,
  userId: string,
  opts: { lifetimeMs: number; userAgent?: string | null; ipHash?: string | null },
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + opts.lifetimeMs);
  await db.session.create({
    data: {
      id: sha256Hex(token),
      userId,
      expiresAt,
      userAgent: opts.userAgent?.slice(0, 300) ?? null,
      ipHash: opts.ipHash ?? null,
    },
  });
  return { token, expiresAt };
}

/** Resolve a raw cookie token to an active user, or null. */
export async function resolveSession(db: Db, token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 200) return null;
  const id = sha256Hex(token);
  const session = await db.session.findUnique({
    where: { id },
    include: { user: { include: { roles: true } } },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return null;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await db.session.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    roles: session.user.roles.map((r) => r.role as RoleName),
    sessionId: id,
    mfaVerified: session.mfaVerified,
  };
}

export async function revokeSession(db: Db, token: string): Promise<void> {
  await db.session.updateMany({ where: { id: sha256Hex(token), revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(db: Db, userId: string): Promise<number> {
  const res = await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  return res.count;
}
