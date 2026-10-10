import type { Db } from "@/server/db/client";
import type { ProductType } from "@/generated/prisma/client";
import { parseBlocks, type ContentBlock } from "@/lib/content-blocks";

export interface FareConditions {
  handLuggageOnly?: boolean;
  suitcaseKg?: number | null;
  seatReservation?: boolean;
  refundable?: boolean;
  cancellationDays?: number | null;
  cancellationFeePercent?: number | null;
  features?: string[];
  recommended?: boolean;
}

export interface PublicDeparture {
  id: string;
  code: string;
  departAt: Date;
  returnAt: Date | null;
  seatsLeft: number;
  bookingDeadline: Date | null;
  fares: { id: string; code: string; name: string; priceCents: number; conditions: FareConditions }[];
  stops: { id: string; name: string; city: string; plannedAt: Date; platform: string | null; surchargeCents: number }[];
}

export interface TripSummary {
  slug: string;
  title: string;
  productType: ProductType;
  destination: string;
  countryCode: string;
  category: string | null;
  motif: string | null;
  durationDays: number;
  summary: string;
  boardingCities: string[];
  next: { departAt: Date; fromPriceCents: number; seatsLeft: number; count: number } | null;
}

const onSaleWhere = (now: Date) => ({
  status: "ON_SALE" as const,
  departAt: { gt: now },
  OR: [{ bookingDeadline: null }, { bookingDeadline: { gt: now } }],
});

/** Published trips for listings. Trips without a sellable departure are listed honestly as "in Planung". */
export async function listPublishedTrips(db: Db, opts: { productType?: ProductType; now?: Date } = {}): Promise<TripSummary[]> {
  const now = opts.now ?? new Date();
  const trips = await db.trip.findMany({
    where: { status: "PUBLISHED", ...(opts.productType ? { productType: opts.productType } : {}) },
    include: {
      pickups: { orderBy: { sort: "asc" }, include: { stop: { select: { city: true } } } },
      departures: {
        where: onSaleWhere(now),
        orderBy: { departAt: "asc" },
        include: { fares: { where: { isActive: true, priceCents: { gt: 0 } }, select: { priceCents: true } } },
      },
    },
    orderBy: [{ title: "asc" }],
  });
  return trips
    .map((t) => {
      const sellable = t.departures.filter((d) => d.fares.length > 0 && d.capacity - d.soldCount - d.heldCount > 0);
      const first = sellable[0];
      return {
        slug: t.slug,
        title: t.title,
        productType: t.productType,
        destination: t.destination,
        countryCode: t.countryCode,
        category: t.category,
        motif: t.motif,
        durationDays: t.durationDays,
        summary: t.summary,
        boardingCities: t.pickups.map((p) => p.stop.city),
        next: first
          ? {
              departAt: first.departAt,
              fromPriceCents: Math.min(...sellable.flatMap((d) => d.fares.map((f) => f.priceCents))),
              seatsLeft: first.capacity - first.soldCount - first.heldCount,
              count: sellable.length,
            }
          : null,
      };
    })
    .sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next && b.next ? a.next.departAt.getTime() - b.next.departAt.getTime() : 0));
}

export interface TripDetail {
  id: string;
  slug: string;
  title: string;
  productType: ProductType;
  destination: string;
  countryCode: string;
  category: string | null;
  motif: string | null;
  durationDays: number;
  summary: string;
  description: ContentBlock[];
  highlights: string[];
  hotelName: string | null;
  hotelAddress: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  included: string[];
  excluded: string[];
  itinerary: { dayNumber: number; title: string; body: string }[];
  pickups: { city: string; name: string; street: string | null; postalCode: string | null; localTime: string | null; platform: string | null; surchargeCents: number }[];
  optionalServices: { id: string; name: string; description: string | null; priceCents: number; unit: "PER_PERSON" | "PER_BOOKING" }[];
  departures: PublicDeparture[];
}

export async function getPublishedTrip(db: Db, slug: string, now = new Date()): Promise<TripDetail | null> {
  const t = await db.trip.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      inclusions: { orderBy: { sort: "asc" } },
      itinerary: { orderBy: { dayNumber: "asc" } },
      pickups: { orderBy: { sort: "asc" }, include: { stop: true } },
      optionalServices: { where: { isActive: true }, orderBy: { sort: "asc" } },
      departures: {
        where: onSaleWhere(now),
        orderBy: { departAt: "asc" },
        include: {
          fares: { where: { isActive: true, priceCents: { gt: 0 } }, orderBy: { sort: "asc" } },
          stops: { orderBy: { sequence: "asc" }, include: { stop: true } },
        },
      },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    productType: t.productType,
    destination: t.destination,
    countryCode: t.countryCode,
    category: t.category,
    motif: t.motif,
    durationDays: t.durationDays,
    summary: t.summary,
    description: parseBlocks(t.description),
    highlights: t.highlights,
    hotelName: t.hotelName,
    hotelAddress: t.hotelAddress,
    seoTitle: t.seoTitle,
    seoDescription: t.seoDescription,
    included: t.inclusions.filter((i) => i.kind === "INCLUDED").map((i) => i.text),
    excluded: t.inclusions.filter((i) => i.kind === "EXCLUDED").map((i) => i.text),
    itinerary: t.itinerary.map((d) => ({ dayNumber: d.dayNumber, title: d.title, body: d.body })),
    pickups: t.pickups.map((p) => ({
      city: p.stop.city,
      name: p.stop.name,
      street: p.stop.street,
      postalCode: p.stop.postalCode,
      localTime: p.localTime,
      platform: p.platform,
      surchargeCents: p.surchargeCents,
    })),
    optionalServices: t.optionalServices.map((o) => ({ id: o.id, name: o.name, description: o.description, priceCents: o.priceCents, unit: o.unit })),
    departures: t.departures
      .map((d) => ({
        id: d.id,
        code: d.code,
        departAt: d.departAt,
        returnAt: d.returnAt,
        seatsLeft: d.capacity - d.soldCount - d.heldCount,
        bookingDeadline: d.bookingDeadline,
        fares: d.fares.map((f) => ({ id: f.id, code: f.code, name: f.name, priceCents: f.priceCents, conditions: (f.conditions ?? {}) as FareConditions })),
        stops: d.stops.map((s) => ({ id: s.id, name: s.stop.name, city: s.stop.city, plannedAt: s.plannedAt, platform: s.platform, surchargeCents: s.surchargeCents })),
      }))
      .filter((d) => d.seatsLeft > 0 && d.fares.length > 0),
  };
}

/** Legacy URLs used UUIDs; resolve them through the migration map. */
export async function slugForLegacyTourId(db: Db, legacyId: string): Promise<{ slug: string; productType: ProductType } | null> {
  const map = await db.legacyIdMap.findFirst({ where: { legacyId, entityType: "Trip" } });
  if (!map) return null;
  const t = await db.trip.findFirst({ where: { id: map.entityId, status: "PUBLISHED" }, select: { slug: true, productType: true } });
  return t;
}

export function tripPath(t: { slug: string; productType: ProductType }): string {
  return t.productType === "TRANSPORT_ONLY" ? `/wochenendtrips/${t.slug}` : `/reisen/${t.slug}`;
}
