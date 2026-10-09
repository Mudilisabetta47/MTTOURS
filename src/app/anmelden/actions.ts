"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db/client";
import { loginWithPassword } from "@/server/auth/login";
import { revokeSession } from "@/server/auth/session-store";
import { clearSessionCookie, readSessionToken, requestMeta, setSessionCookie } from "@/server/auth/session";
import { isStaff } from "@/lib/rbac";
import { safeNextPath } from "@/lib/safe-redirect";

export interface LoginState {
  error?: string;
}

const LoginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(256),
  next: z.string().max(300).optional(),
});

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "Bitte E-Mail-Adresse und Passwort eingeben." };

  const meta = await requestMeta();
  const result = await loginWithPassword(db, { ...parsed.data, ...meta });
  if (!result.ok) {
    return {
      error:
        result.reason === "rate_limited"
          ? "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten."
          : "E-Mail-Adresse oder Passwort ist nicht korrekt.",
    };
  }

  await setSessionCookie(result.token, result.expiresAt);
  const fallback = isStaff(result.roles) ? "/admin" : result.roles.includes("DRIVER") ? "/fahrer" : "/";
  redirect(safeNextPath(parsed.data.next, fallback) as never);
}

export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) await revokeSession(db, token);
  await clearSessionCookie();
  redirect("/anmelden");
}
