"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";
import { endRun, LiveError, startRun } from "@/server/live/tracking";

async function run(fd: FormData, fn: typeof startRun) {
  const user = await requirePermission("driverapp.use");
  const id = String(fd.get("runId") ?? "").slice(0, 64);
  try {
    await fn(db, user, id);
  } catch (e) {
    if (e instanceof LiveError) redirect(`/fahrer/fahrt/${encodeURIComponent(id)}?fehler=${encodeURIComponent(e.message)}` as never);
    throw e;
  }
  redirect(`/fahrer/fahrt/${encodeURIComponent(id)}` as never);
}

export async function startRunAction(fd: FormData) {
  await run(fd, startRun);
}
export async function endRunAction(fd: FormData) {
  await run(fd, endRun);
}
