import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect, forbidden } from "next/navigation";
import { db } from "@/server/db/client";
import { env } from "@/lib/env";
import { can, isStaff, type Permission } from "@/lib/rbac";
import { hashIp } from "./tokens";
import { resolveSession, type SessionUser } from "./session-store";

export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-mt_session" : "mt_session";

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Current user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return resolveSession(db, await readSessionToken());
});

export async function requestMeta(): Promise<{ ipHash: string | null; userAgent: string | null }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  return { ipHash: hashIp(ip, env().SESSION_SECRET), userAgent: h.get("user-agent") };
}

/** Staff area guard. Not logged in → login page. Logged in without permission → 403. */
export async function requireStaff(permission: Permission = "dashboard.view"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden?next=/admin");
  if (!isStaff(user.roles) || !can(user.roles, permission)) forbidden();
  return user;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/anmelden");
  if (!can(user.roles, permission)) forbidden();
  return user;
}
