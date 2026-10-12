import { z } from "zod";
import type { Db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { tzOffsetMinutes } from "@/lib/time";

type Actor = { id: string; displayName: string };
export class TripAdminError extends Error {}

const json = (v: unknown) => JSON.parse(JSON.stringify(v));

/** "1.299,50" / "499" / "499.00" → cents. Never floats in storage. */
export function parseEuro(input: string): number {
  const s = input.trim().replace(/\s|€/g, "");
  if (!s) throw new TripAdminError("Preis fehlt.");
  const normalized = /,\d{1,2}$/.test(s) ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) throw new TripAdminError(`Ungültiger Preis: „${input}“`);
  const [eur, ct = ""] = normalized.split(".");
  return Number(eur) * 100 + Number(ct.padEnd(2, "0"));
}

/** local date "YYYY-MM-DD" + "HH:MM" (Europe/Berlin) → UTC Date */
export function berlinDateTime(date: string, time: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new TripAdminError("Datum oder Uhrzeit ungültig.");
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60_000);
}

/** Paragraphs separated by blank lines; "## " starts a heading, "- " lines form a list. */
export function textToBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      if (p.startsWith("## ")) return { type: "h2", text: p.slice(3).trim() };
      const lines = p.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return { type: "ul", items: lines.map((l) => l.slice(2).trim()).filter(Boolean) };
      return { type: "p", text: lines.join(" ") };
    });
}

export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map((b: { type?: string; text?: string; items?: string[] }) =>
      b.type === "h2" ? `## ${b.text ?? ""}` : b.type === "ul" ? (b.items ?? []).map((i) => `- ${i}`).join("\n") : (b.text ?? ""),
    )
    .join("\n\n");
}

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Nur Kleinbuchstaben, Zahlen und Bindestriche.")
  .max(80);
const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const TripCreateInput = z.object({
  title: z.string().trim().min(3).max(120),
  slug,
  productType: z.enum(["PACKAGE_TOUR", "TRANSPORT_ONLY", "DAY_TRIP", "GROUP_TOUR"]),
  destination: z.string().trim().min(2).max(80),
  countryCode: z.string().trim().toUpperCase().length(2),
  durationDays: z.coerce.number().int().min(1).max(30),
});

export const TripBasicsInput = TripCreateInput.omit({ slug: true, productType: true }).extend({
  summary: z.string().trim().min(20, "Kurzbeschreibung: mindestens 20 Zeichen.").max(300),
  description: z.string().max(8000).default(""),
  category: opt(60),
  durationNights: z.coerce.number().int().min(0).max(30),
  highlights: z.string().max(400).default(""),
});

export const HotelInput = z.object({
  hotelName: opt(120),
  hotelStars: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).max(5).nullable()),
  hotelAddress: opt(200),
  latitude: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(-90).max(90).nullable()),
  longitude: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(-180).max(180).nullable()),
});

export const SeoInput = z.object({
  seoTitle: opt(70),
  seoDescription: opt(170),
  noindex: z.boolean(),
  guideId: opt(64),
});

async function tripOr404(db: Db, id: string) {
  const t = await db.trip.findUnique({ where: { id } });
  if (!t) throw new TripAdminError("Reise nicht gefunden.");
  return t;
}

export async function createTrip(db: Db, actor: Actor, data: z.infer<typeof TripCreateInput>) {
  if (await db.trip.findUnique({ where: { slug: data.slug } })) throw new TripAdminError(`Die Adresse „${data.slug}“ ist schon vergeben.`);
  const t = await db.trip.create({ data: { ...data, summary: "", description: [], status: "DRAFT" } });
  await audit(db, { actorUserId: actor.id, action: "trip.create", entityType: "Trip", entityId: t.id, after: json(data) });
  return t;
}

export async function updateBasics(db: Db, actor: Actor, id: string, data: z.infer<typeof TripBasicsInput>) {
  const before = await tripOr404(db, id);
  const after = {
    title: data.title,
    destination: data.destination,
    countryCode: data.countryCode,
    durationDays: data.durationDays,
    durationNights: data.durationNights,
    summary: data.summary,
    category: data.category,
    description: textToBlocks(data.description),
    highlights: data.highlights
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean)
      .slice(0, 8),
  };
  await db.trip.update({ where: { id }, data: after });
  await audit(db, { actorUserId: actor.id, action: "trip.update", entityType: "Trip", entityId: id, before: json(before), after: json(after) });
}

export async function updateHotel(db: Db, actor: Actor, id: string, data: z.infer<typeof HotelInput>) {
  await tripOr404(db, id);
  await db.trip.update({ where: { id }, data });
  await audit(db, { actorUserId: actor.id, action: "trip.hotel", entityType: "Trip", entityId: id, after: json(data) });
}

export async function updateSeo(db: Db, actor: Actor, id: string, data: z.infer<typeof SeoInput>) {
  await tripOr404(db, id);
  await db.trip.update({ where: { id }, data });
  await audit(db, { actorUserId: actor.id, action: "trip.seo", entityType: "Trip", entityId: id, after: json(data) });
}

/** Publishing rules. A package tour may be published (page + interest list) but is only sold with a Sicherungsschein. */
export async function setTripStatus(db: Db, actor: Actor, id: string, status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED") {
  const t = await tripOr404(db, id);
  if (status === "PUBLISHED") {
    const missing = [!t.summary && "Kurzbeschreibung", !t.destination && "Reiseziel", !t.durationDays && "Dauer"].filter(Boolean);
    if (missing.length) throw new TripAdminError(`Vor der Veröffentlichung fehlt: ${missing.join(", ")}.`);
  }
  if (status === "ARCHIVED") {
    const open = await db.tripDeparture.count({ where: { tripId: id, status: "ON_SALE", departAt: { gt: new Date() } } });
    if (open) throw new TripAdminError("Bitte zuerst den Verkauf der offenen Termine beenden.");
  }
  await db.trip.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? (t.publishedAt ?? new Date()) : t.publishedAt } });
  await audit(db, { actorUserId: actor.id, action: `trip.status.${status.toLowerCase()}`, entityType: "Trip", entityId: id, before: { status: t.status } });
}

export async function setInsolvencyCertificate(db: Db, actor: Actor, id: string, ref: string | null) {
  const t = await tripOr404(db, id);
  if (t.productType !== "PACKAGE_TOUR") throw new TripAdminError("Nur für Pauschalreisen.");
  await db.trip.update({ where: { id }, data: { insolvencyCertificateRef: ref } });
  await audit(db, { actorUserId: actor.id, action: "trip.insolvency_certificate", entityType: "Trip", entityId: id, before: { ref: t.insolvencyCertificateRef }, after: { ref } });
}

export async function replaceInclusions(db: Db, actor: Actor, id: string, included: string, excluded: string) {
  await tripOr404(db, id);
  const lines = (s: string) =>
    s
      .split("\n")
      .map((l) => l.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 30)
      .map((l) => l.slice(0, 160));
  const inc = lines(included);
  const exc = lines(excluded);
  await db.$transaction([
    db.tripInclusion.deleteMany({ where: { tripId: id } }),
    db.tripInclusion.createMany({
      data: [...inc.map((text, i) => ({ tripId: id, kind: "INCLUDED" as const, text, sort: i })), ...exc.map((text, i) => ({ tripId: id, kind: "EXCLUDED" as const, text, sort: i }))],
    }),
  ]);
  await audit(db, { actorUserId: actor.id, action: "trip.inclusions", entityType: "Trip", entityId: id, after: { included: inc, excluded: exc } });
}

export async function replaceItinerary(db: Db, actor: Actor, id: string, days: { title: string; body: string }[]) {
  await tripOr404(db, id);
  const clean = days.filter((d) => d.title.trim()).slice(0, 30);
  await db.$transaction([
    db.tripItineraryDay.deleteMany({ where: { tripId: id } }),
    db.tripItineraryDay.createMany({ data: clean.map((d, i) => ({ tripId: id, dayNumber: i + 1, title: d.title.trim().slice(0, 120), body: d.body.trim().slice(0, 2000) })) }),
  ]);
  await audit(db, { actorUserId: actor.id, action: "trip.itinerary", entityType: "Trip", entityId: id, after: { days: clean.length } });
}

export const PickupInput = z.object({
  stopId: z.string().min(1).max(64),
  localTime: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{2}:\d{2}$/).nullable()),
  platform: opt(60),
  surcharge: z.string().max(20).default("0"),
});

export async function upsertPickup(db: Db, actor: Actor, tripId: string, data: z.infer<typeof PickupInput>) {
  await tripOr404(db, tripId);
  const surchargeCents = data.surcharge.trim() ? parseEuro(data.surcharge) : 0;
  const max = await db.tripPickup.aggregate({ where: { tripId }, _max: { sort: true } });
  await db.tripPickup.upsert({
    where: { tripId_stopId: { tripId, stopId: data.stopId } },
    create: { tripId, stopId: data.stopId, localTime: data.localTime, platform: data.platform, surchargeCents, sort: (max._max.sort ?? 0) + 1 },
    update: { localTime: data.localTime, platform: data.platform, surchargeCents },
  });
  await audit(db, { actorUserId: actor.id, action: "trip.pickup", entityType: "Trip", entityId: tripId, after: { ...data, surchargeCents } });
}

export async function removePickup(db: Db, actor: Actor, tripId: string, stopId: string) {
  await db.tripPickup.deleteMany({ where: { tripId, stopId } });
  await audit(db, { actorUserId: actor.id, action: "trip.pickup.remove", entityType: "Trip", entityId: tripId, after: { stopId } });
}

export const ServiceInput = z.object({
  id: opt(64),
  name: z.string().trim().min(2).max(100),
  description: opt(240),
  price: z.string().max(20),
  unit: z.enum(["PER_PERSON", "PER_BOOKING"]),
  maxPerBooking: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).max(50).nullable()),
  isActive: z.boolean(),
});

export async function saveService(db: Db, actor: Actor, tripId: string, data: z.infer<typeof ServiceInput>) {
  await tripOr404(db, tripId);
  const priceCents = parseEuro(data.price);
  if (priceCents <= 0) throw new TripAdminError("Zusatzleistungen brauchen einen Preis über 0 €.");
  const values = { name: data.name, description: data.description, priceCents, unit: data.unit, maxPerBooking: data.maxPerBooking, isActive: data.isActive };
  const s = data.id
    ? await db.optionalService.update({ where: { id: data.id, tripId }, data: values })
    : await db.optionalService.create({ data: { tripId, ...values } });
  await audit(db, { actorUserId: actor.id, action: "trip.service", entityType: "OptionalService", entityId: s.id, after: json(values) });
}

// ── departures ─────────────────────────────────────────────────────────

export const DepartureCreateInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Abfahrtsdatum fehlt."),
  returnDate: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  returnTime: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{2}:\d{2}$/).nullable()),
  capacity: z.coerce.number().int().min(1).max(90),
  fares: z
    .array(z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,20}$/), name: z.string().trim().min(2).max(40), price: z.string().max(20), features: z.string().max(600) }))
    .min(1, "Mindestens ein Tarif."),
  recommended: z.string().max(20).optional(),
});

export async function createDeparture(db: Db, actor: Actor, tripId: string, data: z.infer<typeof DepartureCreateInput>) {
  const t = await db.trip.findUnique({ where: { id: tripId }, include: { pickups: { orderBy: { sort: "asc" }, include: { stop: true } } } });
  if (!t) throw new TripAdminError("Reise nicht gefunden.");
  if (!t.pickups.length) throw new TripAdminError("Bitte zuerst Zustiege mit Uhrzeit anlegen – sie werden für den Termin übernommen.");
  const missingTime = t.pickups.filter((p) => !p.localTime);
  if (missingTime.length) throw new TripAdminError(`Zustieg ohne Uhrzeit: ${missingTime.map((p) => p.stop.name).join(", ")}.`);
  const fares = data.fares.filter((f) => f.price.trim());
  if (!fares.length) throw new TripAdminError("Mindestens ein Tarif mit Preis.");
  const priced = fares.map((f, i) => {
    const priceCents = parseEuro(f.price);
    if (priceCents <= 0) throw new TripAdminError(`Tarif ${f.name}: Preis muss über 0 € liegen.`);
    const features = f.features
      .split("\n")
      .map((x) => x.replace(/^[-•]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
    return { code: f.code, name: f.name, priceCents, sort: i, conditions: { features, recommended: data.recommended === f.code } };
  });
  const stops = t.pickups.map((p, i) => ({ stopId: p.stopId, sequence: i + 1, plannedAt: berlinDateTime(data.date, p.localTime!), platform: p.platform, surchargeCents: p.surchargeCents }));
  const departAt = stops.reduce((a, s) => (s.plannedAt < a ? s.plannedAt : a), stops[0]!.plannedAt);
  if (departAt <= new Date()) throw new TripAdminError("Der Termin liegt in der Vergangenheit.");
  const returnAt = data.returnDate ? berlinDateTime(data.returnDate, data.returnTime ?? "20:00") : null;
  if (returnAt && returnAt <= departAt) throw new TripAdminError("Die Rückkehr muss nach der Abfahrt liegen.");
  const code = `${t.slug.toUpperCase().slice(0, 40)}-${data.date}`;
  if (await db.tripDeparture.findUnique({ where: { code } })) throw new TripAdminError(`Für den ${data.date} gibt es bereits einen Termin.`);
  const dep = await db.tripDeparture.create({
    data: { tripId, code, departAt, returnAt, capacity: data.capacity, status: "DRAFT", fares: { create: priced }, stops: { create: stops } },
  });
  await audit(db, { actorUserId: actor.id, action: "departure.create", entityType: "TripDeparture", entityId: dep.id, after: json({ code, capacity: data.capacity, fares: priced }) });
  return dep;
}

export async function setDepartureStatus(db: Db, actor: Actor, id: string, status: "DRAFT" | "ON_SALE" | "SALES_CLOSED" | "CANCELLED") {
  const dep = await db.tripDeparture.findUnique({ where: { id }, include: { trip: true, fares: { where: { isActive: true, priceCents: { gt: 0 } } }, stops: true } });
  if (!dep) throw new TripAdminError("Termin nicht gefunden.");
  if (status === "ON_SALE") {
    if (dep.departAt <= new Date()) throw new TripAdminError("Vergangene Termine können nicht verkauft werden.");
    if (!dep.fares.length || !dep.stops.length) throw new TripAdminError("Für den Verkauf fehlen Tarife oder Zustiege.");
    if (dep.trip.status !== "PUBLISHED") throw new TripAdminError("Die Reise ist noch nicht veröffentlicht.");
  }
  if (status === "DRAFT" && dep.soldCount + dep.heldCount > 0) throw new TripAdminError("Termin hat Buchungen – zurück in den Entwurf ist nicht möglich.");
  await db.tripDeparture.update({ where: { id }, data: { status } });
  await audit(db, { actorUserId: actor.id, action: `departure.status.${status.toLowerCase()}`, entityType: "TripDeparture", entityId: id, before: { status: dep.status } });
  return dep.trip.productType === "PACKAGE_TOUR" && !dep.trip.insolvencyCertificateRef && status === "ON_SALE" ? "package_locked" : "ok";
}

export async function setCapacity(db: Db, actor: Actor, id: string, capacity: number) {
  const dep = await db.tripDeparture.findUnique({ where: { id } });
  if (!dep) throw new TripAdminError("Termin nicht gefunden.");
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 90) throw new TripAdminError("Plätze: 1 bis 90.");
  if (capacity < dep.soldCount + dep.heldCount) throw new TripAdminError(`Es sind bereits ${dep.soldCount + dep.heldCount} Plätze verkauft oder reserviert.`);
  await db.tripDeparture.update({ where: { id }, data: { capacity } });
  await audit(db, { actorUserId: actor.id, action: "departure.capacity", entityType: "TripDeparture", entityId: id, before: { capacity: dep.capacity }, after: { capacity } });
}

/** Price changes apply to new bookings only; existing orders keep their own price lines. */
export async function updateFare(db: Db, actor: Actor, fareId: string, data: { name: string; price: string; features: string; isActive: boolean; recommended: boolean }) {
  const f = await db.departureFare.findUnique({ where: { id: fareId } });
  if (!f) throw new TripAdminError("Tarif nicht gefunden.");
  const priceCents = parseEuro(data.price);
  if (priceCents <= 0) throw new TripAdminError("Preis muss über 0 € liegen.");
  const features = data.features
    .split("\n")
    .map((x) => x.replace(/^[-•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
  await db.departureFare.update({
    where: { id: fareId },
    data: { name: data.name.trim().slice(0, 40), priceCents, isActive: data.isActive, conditions: { ...((f.conditions as object) ?? {}), features, recommended: data.recommended } },
  });
  await audit(db, { actorUserId: actor.id, action: "fare.update", entityType: "DepartureFare", entityId: fareId, before: { priceCents: f.priceCents, name: f.name }, after: { priceCents, name: data.name } });
}

// ── media ──────────────────────────────────────────────────────────────

export async function updateMedia(db: Db, actor: Actor, tripId: string, mediaId: string, data: { alt: string; rightsConfirmed: boolean; hero: boolean; visible: boolean }) {
  const link = await db.tripMedia.findUnique({ where: { tripId_mediaId: { tripId, mediaId } } });
  if (!link) throw new TripAdminError("Bild nicht gefunden.");
  if (data.alt.trim().length < 5) throw new TripAdminError("Bitte eine Bildbeschreibung (Alt-Text) angeben.");
  await db.mediaAsset.update({ where: { id: mediaId }, data: { alt: data.alt.trim().slice(0, 200), rightsConfirmed: data.rightsConfirmed } });
  if (!data.visible) {
    // unlink only – the file and its audit history stay
    await db.tripMedia.delete({ where: { tripId_mediaId: { tripId, mediaId } } });
  } else if (data.hero) {
    await db.$transaction([
      db.tripMedia.updateMany({ where: { tripId, role: "HERO" }, data: { role: "GALLERY" } }),
      db.tripMedia.update({ where: { tripId_mediaId: { tripId, mediaId } }, data: { role: "HERO", sort: 0 } }),
    ]);
  }
  await audit(db, { actorUserId: actor.id, action: "trip.media", entityType: "MediaAsset", entityId: mediaId, after: json(data) });
}
