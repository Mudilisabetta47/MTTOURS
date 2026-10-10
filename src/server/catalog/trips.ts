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
  durationNights: number;
  hotelName: string | null;
  /** first included services (only what the office entered) */
  included: string[];
  /** standard pickup times from the trip template, "HH:MM" local; per departure the real times apply */
  pickupTimes: { city: string; name: string; localTime: string | null }[];
  next: {
    departAt: Date;
    returnAt: Date | null;
    /** real boarding times of the next bookable departure, in route order */
    stops: { city: string; name: string; at: Date; surchargeCents: number }[];
    fromPriceCents: number;
    seatsLeft: number;
    count: number;
  } | null;
  /** same derivation as the trip page (BOOKABLE only when it can really be bought online) */
  state: "BOOKABLE" | "SOLD_OUT" | "COMING_SOON";
  cover: { src: string; alt: string; width: number; height: number; rightsConfirmed: boolean } | null;
}

/** Media without confirmed rights are only shown outside production. */
const showUnconfirmedMedia = () => process.env.APP_ENV !== "production";

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
      pickups: { orderBy: { sort: "asc" }, include: { stop: { select: { city: true, name: true } } } },
      inclusions: { where: { kind: "INCLUDED" }, orderBy: { sort: "asc" }, take: 4, select: { text: true } },
      departures: {
        where: onSaleWhere(now),
        orderBy: { departAt: "asc" },
        include: {
          fares: { where: { isActive: true, priceCents: { gt: 0 } }, select: { priceCents: true } },
          stops: {
            where: { kind: { in: ["PICKUP", "PICKUP_DROPOFF"] } },
            orderBy: { sequence: "asc" },
            select: { surchargeCents: true, plannedAt: true, stop: { select: { city: true, name: true } } },
          },
        },
      },
      media: {
        orderBy: [{ role: "desc" }, { sort: "asc" }],
        take: 3,
        include: { media: { include: { file: { select: { key: true, bucket: true, visibility: true } } } } },
      },
    },
    orderBy: [{ title: "asc" }],
  });
  return trips
    .map((t) => {
      const locked = t.productType === "PACKAGE_TOUR" && !t.insolvencyCertificateRef;
      const open = t.departures.filter((d) => d.fares.length > 0 && d.stops.length > 0);
      const sellable = locked ? [] : open.filter((d) => d.capacity - d.soldCount - d.heldCount > 0);
      const first = sellable[0];
      const cover = t.media
        .map((m) => m.media)
        .find((m) => m.file.bucket === "public" && m.file.visibility === "PUBLIC" && (m.rightsConfirmed || showUnconfirmedMedia()));
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
        durationNights: t.durationNights,
        hotelName: t.hotelName,
        included: t.inclusions.map((i) => i.text),
        pickupTimes: t.pickups.map((p) => ({ city: p.stop.city, name: p.stop.name, localTime: p.localTime })),
        next: first
          ? {
              departAt: first.departAt,
              returnAt: first.returnAt,
              stops: first.stops.map((x) => ({ city: x.stop.city, name: x.stop.name, at: x.plannedAt, surchargeCents: x.surchargeCents })),
              // cheapest fare + cheapest boarding point: a price one traveller can actually pay
              fromPriceCents: Math.min(...sellable.map((d) => Math.min(...d.fares.map((f) => f.priceCents)) + Math.min(...d.stops.map((x) => x.surchargeCents)))),
              seatsLeft: first.capacity - first.soldCount - first.heldCount,
              count: sellable.length,
            }
          : null,
        state: first ? ("BOOKABLE" as const) : !locked && open.length ? ("SOLD_OUT" as const) : ("COMING_SOON" as const),
        cover: cover ? { src: `/media/${cover.file.key}`, alt: cover.alt, width: cover.width, height: cover.height, rightsConfirmed: cover.rightsConfirmed } : null,
      };
    })
    .sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next && b.next ? a.next.departAt.getTime() - b.next.departAt.getTime() : 0));
}

/**
 * Booking state of a trip page, derived from the database on every request:
 * - BOOKABLE     at least one departure can be bought online right now
 * - SOLD_OUT     departures are on sale but no seat is left
 * - CANCELLED    all upcoming departures were cancelled
 * - COMING_SOON  nothing on sale yet (or online sale is locked) – interest list instead of checkout
 * Unpublished trips (DRAFT/REVIEW/ARCHIVED) never reach the public page.
 */
export type TripState = "BOOKABLE" | "SOLD_OUT" | "CANCELLED" | "COMING_SOON";

export interface TripMediaItem {
  src: string;
  alt: string;
  width: number;
  height: number;
  rightsConfirmed: boolean;
  isAiGenerated: boolean;
}

export interface TripDeparture extends PublicDeparture {
  state: "BOOKABLE" | "SOLD_OUT";
  /** lowest price a single traveller can actually pay for this date (cheapest fare + cheapest boarding point) */
  fromPriceCents: number;
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
  durationNights: number;
  summary: string;
  description: ContentBlock[];
  highlights: string[];
  hotelName: string | null;
  hotelStars: number | null;
  hotelAddress: string | null;
  hotelLat: number | null;
  hotelLng: number | null;
  guideId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  included: string[];
  excluded: string[];
  itinerary: { dayNumber: number; title: string; body: string }[];
  pickups: { city: string; name: string; street: string | null; postalCode: string | null; localTime: string | null; platform: string | null; surchargeCents: number }[];
  optionalServices: { id: string; name: string; description: string | null; priceCents: number; unit: "PER_PERSON" | "PER_BOOKING"; max: number }[];
  media: TripMediaItem[];
  state: TripState;
  /** set when departures exist but online sale is not allowed yet */
  lockReason: "package_unprotected" | null;
  departures: TripDeparture[];
  fromPriceCents: number | null;
  insolvencyProtected: boolean;
}

export async function getPublishedTrip(db: Db, slug: string, now = new Date()): Promise<TripDetail | null> {
  const t = await db.trip.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      inclusions: { orderBy: { sort: "asc" } },
      itinerary: { orderBy: { dayNumber: "asc" } },
      pickups: { orderBy: { sort: "asc" }, include: { stop: true } },
      optionalServices: { where: { isActive: true }, orderBy: { sort: "asc" } },
      media: { orderBy: [{ role: "desc" }, { sort: "asc" }], include: { media: { include: { file: { select: { key: true, bucket: true, visibility: true } } } } } },
      departures: {
        where: { departAt: { gt: now }, status: { in: ["ON_SALE", "CANCELLED"] } },
        orderBy: { departAt: "asc" },
        include: {
          fares: { where: { isActive: true, priceCents: { gt: 0 } }, orderBy: { sort: "asc" } },
          stops: { where: { kind: { in: ["PICKUP", "PICKUP_DROPOFF"] } }, orderBy: { sequence: "asc" }, include: { stop: true } },
        },
      },
    },
  });
  if (!t) return null;

  const locked = t.productType === "PACKAGE_TOUR" && !t.insolvencyCertificateRef;
  const open = t.departures.filter(
    (d) => d.status === "ON_SALE" && (!d.bookingDeadline || d.bookingDeadline > now) && d.fares.length > 0 && d.stops.length > 0,
  );
  const departures: TripDeparture[] = open.map((d) => {
    const seatsLeft = Math.max(0, d.capacity - d.soldCount - d.heldCount);
    return {
      id: d.id,
      code: d.code,
      departAt: d.departAt,
      returnAt: d.returnAt,
      seatsLeft,
      bookingDeadline: d.bookingDeadline,
      state: seatsLeft > 0 ? "BOOKABLE" : "SOLD_OUT",
      fromPriceCents: Math.min(...d.fares.map((f) => f.priceCents)) + Math.min(...d.stops.map((s) => s.surchargeCents)),
      fares: d.fares.map((f) => ({ id: f.id, code: f.code, name: f.name, priceCents: f.priceCents, conditions: (f.conditions ?? {}) as FareConditions })),
      stops: d.stops.map((s) => ({ id: s.id, name: s.stop.name, city: s.stop.city, plannedAt: s.plannedAt, platform: s.platform, surchargeCents: s.surchargeCents })),
    };
  });
  const sellable = departures.filter((d) => d.state === "BOOKABLE");
  const state: TripState = locked
    ? "COMING_SOON"
    : sellable.length
      ? "BOOKABLE"
      : departures.length
        ? "SOLD_OUT"
        : t.departures.length && t.departures.every((d) => d.status === "CANCELLED")
          ? "CANCELLED"
          : "COMING_SOON";

  const media = t.media
    .filter((m) => m.media.file.bucket === "public" && m.media.file.visibility === "PUBLIC")
    .filter((m) => m.media.rightsConfirmed || showUnconfirmedMedia())
    .map((m) => ({
      src: `/media/${m.media.file.key}`,
      alt: m.media.alt,
      width: m.media.width,
      height: m.media.height,
      rightsConfirmed: m.media.rightsConfirmed,
      isAiGenerated: m.media.isAiGenerated,
    }));

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
    durationNights: t.durationNights,
    summary: t.summary,
    description: parseBlocks(t.description),
    highlights: t.highlights,
    hotelName: t.hotelName,
    hotelStars: t.hotelStars,
    hotelAddress: t.hotelAddress,
    hotelLat: t.latitude,
    hotelLng: t.longitude,
    guideId: t.guideId,
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
    optionalServices: t.optionalServices.map((o) => ({
      id: o.id,
      name: o.name,
      description: o.description,
      priceCents: o.priceCents,
      unit: o.unit,
      max: o.maxPerBooking ?? 20,
    })),
    media,
    state,
    lockReason: locked && departures.length ? "package_unprotected" : null,
    departures: locked ? [] : departures,
    fromPriceCents: !locked && sellable.length ? Math.min(...sellable.map((d) => d.fromPriceCents)) : null,
    insolvencyProtected: t.productType === "PACKAGE_TOUR" && !!t.insolvencyCertificateRef,
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
