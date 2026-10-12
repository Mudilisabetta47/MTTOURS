"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requireStaff } from "@/server/auth/session";
import type { Permission } from "@/lib/rbac";
import { createDriverProfile, createRunForDeparture, createVehicle, LiveError, RunCreateInput, VehicleInput } from "@/server/live/tracking";

async function act(permission: Permission, ok: string, fn: (actor: { id: string; displayName: string }) => Promise<unknown>) {
  const actor = await requireStaff(permission);
  try {
    await fn(actor);
  } catch (e) {
    if (e instanceof LiveError) redirect(`/admin/leitstelle?${new URLSearchParams({ fehler: e.message })}` as never);
    if (e && typeof e === "object" && "issues" in e) redirect(`/admin/leitstelle?${new URLSearchParams({ fehler: "Bitte die Eingaben prüfen." })}` as never);
    throw e;
  }
  revalidatePath("/admin/leitstelle");
  redirect(`/admin/leitstelle?${new URLSearchParams({ ok })}` as never);
}

export async function createRunAction(fd: FormData) {
  await act("dispatch.assign", "Fahrt angelegt. Der Fahrer sieht sie jetzt in der Fahrer-App.", (a) => createRunForDeparture(db, a, RunCreateInput.parse(Object.fromEntries(fd))));
}
export async function createVehicleAction(fd: FormData) {
  await act("vehicle.write", "Fahrzeug angelegt.", (a) => createVehicle(db, a, VehicleInput.parse(Object.fromEntries(fd))));
}
export async function createDriverAction(fd: FormData) {
  await act("driver.write", "Fahrerprofil angelegt.", (a) => createDriverProfile(db, a, String(fd.get("userId") ?? "").slice(0, 64)));
}
