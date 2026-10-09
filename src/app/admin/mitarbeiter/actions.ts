"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db/client";
import { requireStaff } from "@/server/auth/session";
import { createAccount, grantRole, revokeRole, StaffError } from "@/server/staff/service";
import { ROLES, type RoleName } from "@/lib/rbac";
import { env } from "@/lib/env";

export interface CreateState {
  error?: string;
  link?: string;
  email?: string;
}

const RoleEnum = z.enum(ROLES);

const CreateInput = z.object({
  email: z.string().trim().email().max(254),
  displayName: z.string().trim().min(2).max(120),
  roles: z.array(RoleEnum.exclude(["CUSTOMER"])).min(1),
});

export async function createStaffAction(_prev: CreateState, formData: FormData): Promise<CreateState> {
  const actor = await requireStaff("staff.write");
  const parsed = CreateInput.safeParse({
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { error: "Bitte Name, E-Mail und mindestens eine Rolle angeben." };
  try {
    const { setPasswordToken } = await createAccount(db, actor, parsed.data);
    revalidatePath("/admin/mitarbeiter");
    // Until transactional e-mail is connected, the link is shown once to the creating admin.
    return { link: `${env().APP_URL}/passwort-setzen?token=${encodeURIComponent(setPasswordToken)}`, email: parsed.data.email };
  } catch (e) {
    if (e instanceof StaffError) return { error: e.message };
    throw e;
  }
}

const RoleChange = z.object({ userId: z.string().min(1).max(64), role: RoleEnum, op: z.enum(["grant", "revoke"]) });

export async function changeRoleAction(formData: FormData): Promise<void> {
  const actor = await requireStaff("role.grant");
  const parsed = RoleChange.parse({ userId: formData.get("userId"), role: formData.get("role"), op: formData.get("op") });
  try {
    if (parsed.op === "grant") await grantRole(db, actor, parsed.userId, parsed.role as RoleName);
    else await revokeRole(db, actor, parsed.userId, parsed.role as RoleName);
  } catch (e) {
    if (!(e instanceof StaffError)) throw e;
  }
  revalidatePath("/admin/mitarbeiter");
}
