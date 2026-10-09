"use server";

import { z } from "zod";
import { db } from "@/server/db/client";
import { hashPassword, validatePasswordStrength } from "@/server/auth/password";
import { setPasswordWithToken } from "@/server/staff/service";
import { hitRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/auth/session";

export interface SetPasswordState {
  error?: string;
  done?: boolean;
}

const Input = z.object({
  token: z.string().min(20).max(200),
  password: z.string().max(256),
  confirm: z.string().max(256),
});

export async function setPasswordAction(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const parsed = Input.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: "Der Link ist unvollständig." };
  const { ipHash } = await requestMeta();
  if (ipHash && !(await hitRateLimit(db, `setpw:ip:${ipHash}`, 10, 15 * 60)).allowed) {
    return { error: "Zu viele Versuche. Bitte später erneut versuchen." };
  }
  if (parsed.data.password !== parsed.data.confirm) return { error: "Die Passwörter stimmen nicht überein." };
  const weak = validatePasswordStrength(parsed.data.password);
  if (weak) return { error: weak };

  const ok = await setPasswordWithToken(db, parsed.data.token, await hashPassword(parsed.data.password));
  if (!ok) return { error: "Der Link ist abgelaufen oder wurde bereits verwendet." };
  return { done: true };
}
