import type { Db } from "@/server/db/client";
import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";

export interface TripFilter {
  ziel?: string;
  ab?: string;
  monat?: string; // YYYY-MM
  personen?: number;
}

export interface PublicTripCard {
  slug: string;
  title: string;
  destination: string;
  countryCode: string;
  durationDays: number;
  productType: string;
  nextDepartureAt: Date;
  departuresCount: number;
  fromPriceCents: number;
  seatsLeftOnNext: number;
  boardingCities: string[];
}

/**
 * Bookable trips only: published trip, departure on sale, in the future, before its booking deadline,
 * with at least the requested number of free places (capacity − sold − held), at least one active fare > 0 €.
 */
export async function listBookableTrips(db: Db, filter: TripFilter = {}, now = new Date(), take = 24): Promise<PublicTripCard[]> {
  const personen = Math.min(60, Math.max(1, Math.floor(filter.personen ?? 1)));
  let from = now;
  if (filter.monat && /^\d{4}-\d{2}$/.test(filter.monat)) {
    const [y, m] = filter.monat.split("-").map(Number) as [number, number];
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    if (monthStart > from) from = monthStart;
  }
  const dest = DESTINATIONS.find((d) => d.slug === filter.ziel);
  const dep = DEPARTURE_POINTS.find((d) => d.slug === filter.ab);

  const trips = await db.trip.findMany({
    where: {
      status: "PUBLISHED",
      ...(dest ? { destination: { equals: dest.name, mode: "insensitive" } } : {}),
      departures: {
        some: {
          status: "ON_SALE",
          departAt: { gte: from },
          OR: [{ bookingDeadline: null }, { bookingDeadline: { gt: now } }],
          fares: { some: { isActive: true, priceCents: { gt: 0 } } },
          ...(dep ? { stops: { some: { stop: { city: { equals: dep.name, mode: "insensitive" } } } } } : {}),
        },
      },
    },
    include: {
      departures: {
        where: {
          status: "ON_SALE",
          departAt: { gte: from },
          OR: [{ bookingDeadline: null }, { bookingDeadline: { gt: now } }],
        },
        orderBy: { departAt: "asc" },
        include: {
          fares: { where: { isActive: true, priceCents: { gt: 0 } }, select: { priceCents: true } },
          stops: { include: { stop: { select: { city: true } } } },
        },
      },
    },
    take: take * 2,
  });

  const cards: PublicTripCard[] = [];
  for (const t of trips) {
    const usable = t.departures.filter(
      (d) =>
        d.capacity - d.soldCount - d.heldCount >= personen &&
        d.fares.length > 0 &&
        (!dep || d.stops.some((s) => s.stop.city.toLowerCase() === dep.name.toLowerCase())),
    );
    const next = usable[0];
    if (!next) continue;
    cards.push({
      slug: t.slug,
      title: t.title,
      destination: t.destination,
      countryCode: t.countryCode,
      durationDays: t.durationDays,
      productType: t.productType,
      nextDepartureAt: next.departAt,
      departuresCount: usable.length,
      fromPriceCents: Math.min(...usable.flatMap((d) => d.fares.map((f) => f.priceCents))),
      seatsLeftOnNext: next.capacity - next.soldCount - next.heldCount,
      boardingCities: [...new Set(next.stops.map((s) => s.stop.city))],
    });
  }
  return cards.sort((a, b) => a.nextDepartureAt.getTime() - b.nextDepartureAt.getTime()).slice(0, take);
}
