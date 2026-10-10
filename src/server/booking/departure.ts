import type { Db } from "@/server/db/client";
import type { ProductType } from "@/generated/prisma/client";
import type { FareConditions } from "@/server/catalog/trips";

export interface BookableDeparture {
  code: string;
  departAt: string;
  returnAt: string | null;
  seatsLeft: number;
  isDemo: boolean;
  trip: { slug: string; title: string; destination: string; productType: ProductType; motif: string | null };
  fares: { code: string; name: string; priceCents: number; conditions: FareConditions }[];
  stops: { id: string; name: string; city: string; plannedAt: string; platform: string | null; surchargeCents: number }[];
  options: { id: string; name: string; description: string | null; priceCents: number; unit: "PER_PERSON" | "PER_BOOKING"; max: number }[];
}

export type DepartureState = { ok: true; d: BookableDeparture } | { ok: false; reason: "not_found" | "not_on_sale" | "sold_out" | "package_locked"; tripPath?: string };

/** Serializable data for the booking page. Everything is re-validated on submit. */
export async function getBookableDeparture(db: Db, code: string, now = new Date()): Promise<DepartureState> {
  const dep = await db.tripDeparture.findUnique({
    where: { code },
    include: {
      trip: { include: { optionalServices: { where: { isActive: true }, orderBy: { sort: "asc" } } } },
      fares: { where: { isActive: true, priceCents: { gt: 0 } }, orderBy: { sort: "asc" } },
      stops: { where: { kind: { in: ["PICKUP", "PICKUP_DROPOFF"] } }, orderBy: { sequence: "asc" }, include: { stop: true } },
    },
  });
  if (!dep || dep.trip.status !== "PUBLISHED") return { ok: false, reason: "not_found" };
  const tripPath = dep.trip.productType === "TRANSPORT_ONLY" ? `/wochenendtrips/${dep.trip.slug}` : `/reisen/${dep.trip.slug}`;
  if (dep.status !== "ON_SALE" || dep.departAt <= now || (dep.bookingDeadline && dep.bookingDeadline <= now) || !dep.fares.length || !dep.stops.length) {
    return { ok: false, reason: "not_on_sale", tripPath };
  }
  if (dep.trip.productType === "PACKAGE_TOUR" && !dep.trip.insolvencyCertificateRef) return { ok: false, reason: "package_locked", tripPath };
  const seatsLeft = dep.capacity - dep.soldCount - dep.heldCount;
  if (seatsLeft <= 0) return { ok: false, reason: "sold_out", tripPath };
  return {
    ok: true,
    d: {
      code: dep.code,
      departAt: dep.departAt.toISOString(),
      returnAt: dep.returnAt?.toISOString() ?? null,
      seatsLeft,
      isDemo: dep.code.startsWith("DEMO-"),
      trip: { slug: dep.trip.slug, title: dep.trip.title, destination: dep.trip.destination, productType: dep.trip.productType, motif: dep.trip.motif },
      fares: dep.fares.map((f) => ({ code: f.code, name: f.name, priceCents: f.priceCents, conditions: (f.conditions ?? {}) as FareConditions })),
      stops: dep.stops.map((s) => ({ id: s.id, name: s.stop.name, city: s.stop.city, plannedAt: s.plannedAt.toISOString(), platform: s.platform, surchargeCents: s.surchargeCents })),
      options: dep.trip.optionalServices.map((o) => ({ id: o.id, name: o.name, description: o.description, priceCents: o.priceCents, unit: o.unit, max: o.maxPerBooking ?? 10 })),
    },
  };
}
