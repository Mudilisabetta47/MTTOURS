import { z } from "zod";
import type { Db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { crowMeters } from "@/server/catalog/destinations";

const CATS = ["SIGHT", "BEACH_NATURE", "FOOD", "LEISURE", "TRANSPORT", "AIRPORT"] as const;
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export const DestinationInput = z.object({
  name: z.string().trim().min(2).max(80),
  region: text(80),
  intro: text(300),
  refLabel: z.string().trim().min(3).max(120),
  refLatitude: lat,
  refLongitude: lng,
  defaultZoom: z.coerce.number().min(3).max(18),
  seoTitle: text(70),
  seoDescription: text(170),
  status: z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]),
});

export const PoiUpdateInput = z.object({
  category: z.enum(CATS),
  description: text(240),
  latitude: lat,
  longitude: lng,
  isActive: z.boolean(),
  isHighlight: z.boolean(),
  highlightText: text(160),
  sort: z.coerce.number().int().min(0).max(999),
});

export const PoiCreateInput = z.object({
  name: z.string().trim().min(2).max(100),
  query: text(160),
  category: z.enum(CATS),
  description: text(240),
  radiusKm: z.coerce.number().min(1).max(150).default(10),
});

type Actor = { id: string; displayName: string };

/** rows contain Dates – the audit log stores plain JSON */
const json = (v: unknown) => JSON.parse(JSON.stringify(v));

export class DestinationAdminError extends Error {}

export async function updateDestination(db: Db, actor: Actor, id: string, data: z.infer<typeof DestinationInput>) {
  const before = await db.destination.findUniqueOrThrow({ where: { id } });
  await db.destination.update({ where: { id }, data });
  await audit(db, { actorUserId: actor.id, action: "destination.update", entityType: "Destination", entityId: id, before: json(before), after: json(data) });
}

/** Manual corrections count as an editorial check by the acting user. */
export async function updatePoi(db: Db, actor: Actor, id: string, data: z.infer<typeof PoiUpdateInput>) {
  const before = await db.destinationPoi.findUniqueOrThrow({ where: { id } });
  const moved = before.latitude !== data.latitude || before.longitude !== data.longitude;
  await db.destinationPoi.update({
    where: { id },
    data: {
      ...data,
      ...(moved ? { source: "editorial", attribution: null, review: "VERIFIED", verifiedAt: new Date(), verifiedBy: `manuell: ${actor.displayName}` } : {}),
    },
  });
  await audit(db, { actorUserId: actor.id, action: "destination.poi.update", entityType: "DestinationPoi", entityId: id, before: json(before), after: json(data) });
}

export async function setPoiReview(db: Db, actor: Actor, id: string, review: "VERIFIED" | "REJECTED" | "DRAFT") {
  await db.destinationPoi.update({
    where: { id },
    data: { review, ...(review === "VERIFIED" ? { verifiedAt: new Date(), verifiedBy: actor.displayName } : {}) },
  });
  await audit(db, { actorUserId: actor.id, action: `destination.poi.${review.toLowerCase()}`, entityType: "DestinationPoi", entityId: id });
}

type Hit = { lat: string; lon: string; osm_type: string; osm_id: number; display_name: string };

/** Look a place up in OpenStreetMap (storable under ODbL) and store it as verified when it lies near the destination. */
export async function addPoiFromOsm(db: Db, actor: Actor, destinationId: string, input: z.infer<typeof PoiCreateInput>, fetcher: typeof fetch = fetch) {
  const d = await db.destination.findUniqueOrThrow({ where: { id: destinationId } });
  const q = input.query ?? `${input.name}, ${d.city}`;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=de&countrycodes=${d.countryCode.toLowerCase()}&q=${encodeURIComponent(q)}`;
  const res = await fetcher(url, { headers: { "User-Agent": "MetropolTours-Admin/1.0 (kundenservice@metours.de)" } });
  if (!res.ok) throw new DestinationAdminError("Die Ortssuche (OpenStreetMap) ist gerade nicht erreichbar.");
  const hits = (await res.json()) as Hit[];
  const center = { lat: d.latitude, lng: d.longitude };
  const hit = hits.find((h) => crowMeters(center, { lat: Number(h.lat), lng: Number(h.lon) }) <= input.radiusKm * 1000);
  if (!hit) throw new DestinationAdminError(`Kein Treffer für „${q}“ im Umkreis von ${input.radiusKm} km. Bitte Suchbegriff präzisieren.`);
  const exists = await db.destinationPoi.findUnique({ where: { destinationId_name: { destinationId, name: input.name } } });
  if (exists) throw new DestinationAdminError(`„${input.name}“ ist bereits vorhanden.`);
  const max = await db.destinationPoi.aggregate({ where: { destinationId }, _max: { sort: true } });
  const poi = await db.destinationPoi.create({
    data: {
      destinationId,
      name: input.name,
      category: input.category,
      description: input.description,
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
      address: hit.display_name.split(", ").slice(0, 4).join(", "),
      source: `osm:${hit.osm_type}/${hit.osm_id}`,
      attribution: "© OpenStreetMap-Mitwirkende (ODbL)",
      // found ≠ checked: the editor confirms the match before it goes public
      review: "DRAFT",
      sort: (max._max.sort ?? 0) + 1,
    },
  });
  await audit(db, { actorUserId: actor.id, action: "destination.poi.create", entityType: "DestinationPoi", entityId: poi.id, after: { name: poi.name, source: poi.source, match: hit.display_name } });
  return { poi, match: hit.display_name };
}

export async function assignTrips(db: Db, actor: Actor, destinationId: string, tripIds: string[]) {
  await db.$transaction([
    db.trip.updateMany({ where: { guideId: destinationId, id: { notIn: tripIds } }, data: { guideId: null } }),
    db.trip.updateMany({ where: { id: { in: tripIds } }, data: { guideId: destinationId } }),
  ]);
  await audit(db, { actorUserId: actor.id, action: "destination.trips", entityType: "Destination", entityId: destinationId, after: { tripIds } });
}
