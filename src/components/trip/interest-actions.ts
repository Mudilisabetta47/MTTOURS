"use server";

import { db } from "@/server/db/client";
import { requestMeta } from "@/server/auth/session";
import { createTripInterest, TripInterestInput } from "@/server/sales/trip-interest";

export interface InterestState {
  status: "idle" | "error" | "done";
  number?: string;
  message?: string;
  errors?: Record<string, string>;
  values?: Record<string, string>;
}

export async function submitTripInterest(_prev: InterestState, fd: FormData): Promise<InterestState> {
  const startedAt = Number(fd.get("t"));
  if (fd.get("website") || !Number.isFinite(startedAt) || Date.now() - startedAt < 2000) return { status: "done" };

  const get = (k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : undefined);
  const values: Record<string, string> = {};
  for (const k of ["name", "email", "telefon", "personen", "zeitraum", "nachricht"]) values[k] = (get(k) ?? "").slice(0, 1500);
  values.datenschutz = fd.get("datenschutz") === "on" ? "on" : "";

  const parsed = TripInterestInput.safeParse({ ...values, tripSlug: get("tripSlug"), datenschutz: fd.get("datenschutz") === "on" });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
    return { status: "error", errors, message: "Bitte prüfen Sie die markierten Felder.", values };
  }
  // The trip must exist and be published – the form never trusts the slug blindly.
  const trip = await db.trip.findFirst({ where: { slug: parsed.data.tripSlug, status: "PUBLISHED" }, select: { slug: true, title: true } });
  if (!trip) return { status: "error", message: "Diese Reise ist nicht mehr verfügbar.", values };

  const { ipHash } = await requestMeta();
  const res = await createTripInterest(db, parsed.data, trip, { ipHash });
  if (!res.ok) return { status: "error", message: "Zu viele Anfragen in kurzer Zeit. Bitte später erneut versuchen oder anrufen.", values };
  return { status: "done", number: res.number };
}
