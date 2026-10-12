"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db/client";
import { requireStaff } from "@/server/auth/session";
import type { Permission } from "@/lib/rbac";
import {
  createDeparture,
  createTrip,
  DepartureCreateInput,
  HotelInput,
  PickupInput,
  removePickup,
  replaceInclusions,
  replaceItinerary,
  saveService,
  SeoInput,
  ServiceInput,
  setCapacity,
  setDepartureStatus,
  setInsolvencyCertificate,
  setTripStatus,
  TripAdminError,
  TripBasicsInput,
  TripCreateInput,
  updateBasics,
  updateFare,
  updateHotel,
  updateMedia,
  updateSeo,
  upsertPickup,
} from "@/server/trips/admin";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const to = (id: string, tab: string, q: Record<string, string>) => `/admin/reisen/${encodeURIComponent(id)}?${new URLSearchParams({ tab, ...q })}`;

/** Runs a change with permission check, catches expected errors and returns to the tab with a message. */
async function run(fd: FormData, permission: Permission, tab: string, ok: string, fn: (actor: { id: string; displayName: string }, id: string) => Promise<string | void>) {
  const actor = await requireStaff(permission);
  const id = str(fd, "tripId");
  let msg = ok;
  try {
    const r = await fn(actor, id);
    if (typeof r === "string") msg = r;
  } catch (e) {
    if (e instanceof TripAdminError) redirect(to(id, tab, { fehler: e.message }) as never);
    if (e && typeof e === "object" && "issues" in e) {
      const first = (e as { issues: { message?: string; path?: unknown[] }[] }).issues[0];
      redirect(to(id, tab, { fehler: `Bitte prüfen: ${first?.path?.join(".") || "Eingabe"} – ${first?.message ?? "ungültig"}` }) as never);
    }
    throw e;
  }
  revalidateTag("catalog", "max");
  redirect(to(id, tab, { ok: msg }) as never);
}

export async function createTripAction(fd: FormData): Promise<void> {
  const actor = await requireStaff("trip.write");
  const parsed = TripCreateInput.safeParse(Object.fromEntries(fd));
  if (!parsed.success) redirect(`/admin/reisen/neu?${new URLSearchParams({ fehler: parsed.error.issues[0]?.message ?? "Bitte die Eingaben prüfen." })}` as never);
  let id: string;
  try {
    id = (await createTrip(db, actor, parsed.data)).id;
  } catch (e) {
    if (e instanceof TripAdminError) redirect(`/admin/reisen/neu?${new URLSearchParams({ fehler: e.message })}` as never);
    throw e;
  }
  redirect(to(id, "grunddaten", { ok: "Reise angelegt. Jetzt Beschreibung, Zustiege und Termine ergänzen." }) as never);
}

export async function saveBasicsAction(fd: FormData) {
  await run(fd, "trip.write", "grunddaten", "Grunddaten gespeichert.", (a, id) => updateBasics(db, a, id, TripBasicsInput.parse(Object.fromEntries(fd))));
}

export async function saveHotelAction(fd: FormData) {
  await run(fd, "trip.write", "unterkunft", "Unterkunft gespeichert.", (a, id) => updateHotel(db, a, id, HotelInput.parse(Object.fromEntries(fd))));
}

export async function saveSeoAction(fd: FormData) {
  await run(fd, "seo.write", "veroeffentlichung", "SEO gespeichert.", (a, id) => updateSeo(db, a, id, SeoInput.parse({ ...Object.fromEntries(fd), noindex: fd.get("noindex") === "on" })));
}

export async function setStatusAction(fd: FormData) {
  const status = str(fd, "status");
  if (!["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"].includes(status)) return;
  await run(fd, "trip.publish", "veroeffentlichung", "Status geändert.", (a, id) => setTripStatus(db, a, id, status as "DRAFT"));
}

export async function setCertificateAction(fd: FormData) {
  await run(fd, "trip.publish", "veroeffentlichung", "Sicherungsschein gespeichert.", (a, id) => setInsolvencyCertificate(db, a, id, str(fd, "ref").trim().slice(0, 120) || null));
}

export async function saveInclusionsAction(fd: FormData) {
  await run(fd, "trip.write", "leistungen", "Leistungen gespeichert.", (a, id) => replaceInclusions(db, a, id, str(fd, "included"), str(fd, "excluded")));
}

export async function saveServiceAction(fd: FormData) {
  await run(fd, "trip.write", "leistungen", "Zusatzleistung gespeichert.", (a, id) => saveService(db, a, id, ServiceInput.parse({ ...Object.fromEntries(fd), isActive: fd.get("isActive") === "on" })));
}

export async function saveItineraryAction(fd: FormData) {
  const titles = fd.getAll("dayTitle").map(String);
  const bodies = fd.getAll("dayBody").map(String);
  await run(fd, "trip.write", "reiseverlauf", "Reiseverlauf gespeichert.", (a, id) => replaceItinerary(db, a, id, titles.map((title, i) => ({ title, body: bodies[i] ?? "" }))));
}

export async function savePickupAction(fd: FormData) {
  await run(fd, "trip.write", "zustiege", "Zustieg gespeichert.", (a, id) => upsertPickup(db, a, id, PickupInput.parse(Object.fromEntries(fd))));
}

export async function removePickupAction(fd: FormData) {
  await run(fd, "trip.write", "zustiege", "Zustieg entfernt.", (a, id) => removePickup(db, a, id, str(fd, "stopId")));
}

export async function createDepartureAction(fd: FormData) {
  const codes = fd.getAll("fareCode").map(String);
  const fares = codes.map((code, i) => ({
    code,
    name: String(fd.getAll("fareName")[i] ?? ""),
    price: String(fd.getAll("farePrice")[i] ?? ""),
    features: String(fd.getAll("fareFeatures")[i] ?? ""),
  }));
  await run(fd, "price.write", "termine", "Termin als Entwurf angelegt. Prüfen und dann „Verkauf starten“.", async (a, id) => {
    await createDeparture(db, a, id, DepartureCreateInput.parse({ ...Object.fromEntries(fd), fares: fares.filter((f) => f.name.trim()) }));
  });
}

export async function departureStatusAction(fd: FormData) {
  const status = str(fd, "status");
  if (!["DRAFT", "ON_SALE", "SALES_CLOSED", "CANCELLED"].includes(status)) return;
  await run(fd, "trip.publish", "termine", "Status des Termins geändert.", async (a) => {
    const r = await setDepartureStatus(db, a, str(fd, "departureId"), status as "ON_SALE");
    if (r === "package_locked") return "Termin im Verkauf – online buchbar wird er erst mit hinterlegtem Sicherungsschein.";
  });
}

export async function capacityAction(fd: FormData) {
  await run(fd, "trip.write", "termine", "Plätze geändert.", (a) => setCapacity(db, a, str(fd, "departureId"), Number(str(fd, "capacity"))));
}

export async function fareAction(fd: FormData) {
  await run(fd, "price.write", "termine", "Tarif gespeichert. Gilt für neue Buchungen.", (a) =>
    updateFare(db, a, str(fd, "fareId"), { name: str(fd, "name"), price: str(fd, "price"), features: str(fd, "features"), isActive: fd.get("isActive") === "on", recommended: fd.get("recommended") === "on" }),
  );
}

export async function mediaAction(fd: FormData) {
  const confirm = fd.get("rightsConfirmed") === "on";
  // confirming image rights is a management decision
  await run(fd, confirm ? "trip.publish" : "trip.write", "bilder", "Bild gespeichert.", (a, id) =>
    updateMedia(db, a, id, str(fd, "mediaId"), { alt: str(fd, "alt"), rightsConfirmed: confirm, hero: fd.get("hero") === "on", visible: fd.get("visible") === "on" }),
  );
}
