import type { PrismaClient } from "../../src/generated/prisma/client.ts";

/**
 * Test data for the e2e database ONLY (global-setup asserts a *_test database before calling this).
 * Codes and texts make the test nature obvious; nothing here resembles production data.
 */
export async function seedE2eCatalog(db: PrismaClient) {
  const day = (n: number, h = 6) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + n);
    d.setUTCHours(h, 0, 0, 0);
    return d;
  };
  const ham = await db.stop.create({ data: { name: "Testhalt Hamburg ZOB", city: "Hamburg", latitude: 53.5523, longitude: 10.0115 } });
  const bre = await db.stop.create({ data: { name: "Testhalt Bremen ZOB", city: "Bremen", latitude: 53.0838, longitude: 8.8136 } });
  const han = await db.stop.create({ data: { name: "Testhalt Hannover ZOB", city: "Hannover", latitude: 52.3795, longitude: 9.7364 } });

  const guide = await db.destination.create({
    data: {
      slug: "e2e-nizza",
      name: "Nizza",
      countryCode: "FR",
      region: "Côte d'Azur",
      city: "Nice",
      latitude: 43.6969,
      longitude: 7.2703,
      refLabel: "Stadtzentrum (Place Masséna)",
      refLatitude: 43.6969,
      refLongitude: 7.2703,
      status: "PUBLISHED",
      pois: {
        create: [
          { name: "Promenade des Anglais", category: "SIGHT", latitude: 43.6948, longitude: 7.2651, source: "editorial", review: "VERIFIED", isHighlight: true, highlightText: "Testtext Highlight", sort: 1 },
          { name: "Cours Saleya", category: "SIGHT", latitude: 43.6955, longitude: 7.2755, source: "editorial", review: "VERIFIED", sort: 2 },
          { name: "Testcafé", category: "FOOD", latitude: 43.697, longitude: 7.276, source: "editorial", review: "VERIFIED", sort: 3 },
          { name: "Teststrand", category: "BEACH_NATURE", latitude: 43.693, longitude: 7.27, source: "editorial", review: "VERIFIED", sort: 4 },
          { name: "Testflughafen", category: "AIRPORT", latitude: 43.6627, longitude: 7.2056, source: "editorial", review: "VERIFIED", sort: 5 },
          // must never appear publicly
          { name: "Ungeprüfter Ort", category: "SIGHT", latitude: 43.7, longitude: 7.28, source: "editorial", review: "DRAFT", sort: 6 },
          { name: "Ausgeblendeter Ort", category: "SIGHT", latitude: 43.7, longitude: 7.28, source: "editorial", review: "VERIFIED", isActive: false, sort: 7 },
        ],
      },
    },
  });
  await db.destination.create({
    data: { slug: "e2e-leer", name: "Leerstadt", countryCode: "CZ", city: "Praha", latitude: 50.087, longitude: 14.42, refLabel: "Testplatz", refLatitude: 50.087, refLongitude: 14.42, status: "PUBLISHED" },
  });

  const base = {
    countryCode: "FR",
    description: [{ type: "p", text: "Testreise für automatisierte Tests." }],
    status: "PUBLISHED" as const,
    publishedAt: new Date(),
  };

  // 1) bookable package tour (test insolvency reference – exists only in the test database)
  const trip = await db.trip.create({
    data: {
      ...base,
      slug: "e2e-testreise",
      title: "E2E Testreise Nizza",
      productType: "PACKAGE_TOUR",
      destination: "Nizza",
      summary: "Testreise mit buchbarem Termin.",
      durationDays: 4,
      durationNights: 3,
      insolvencyCertificateRef: "TEST-SICHERUNGSSCHEIN-E2E",
      guideId: guide.id,
      inclusions: { create: [{ kind: "INCLUDED", text: "Hin- und Rückfahrt im Reisebus" }] },
      optionalServices: { create: [{ name: "Testversicherung", priceCents: 2500, unit: "PER_PERSON" }] },
      pickups: { create: [{ stopId: ham.id, localTime: "06:00", sort: 1 }, { stopId: bre.id, localTime: "07:30", surchargeCents: 1000, sort: 2 }] },
    },
  });
  await db.tripDeparture.create({
    data: {
      tripId: trip.id,
      code: "E2E-NIZZA-1",
      departAt: day(30),
      returnAt: day(33, 18),
      status: "ON_SALE",
      // bookings of both projects + the live fixture still leave seats for searches with 2 travellers
      capacity: 12,
      fares: {
        create: [
          { code: "BASIC", name: "Basic", priceCents: 19900, sort: 1, conditions: { features: ["Handgepäck"] } },
          { code: "SMART", name: "Smart", priceCents: 22900, sort: 2, conditions: { features: ["Handgepäck", "1 Koffer"], recommended: true } },
        ],
      },
      stops: {
        create: [
          { stopId: ham.id, sequence: 1, plannedAt: day(30, 4) },
          { stopId: bre.id, sequence: 2, plannedAt: day(30, 5), surchargeCents: 1000 },
        ],
      },
    },
  });
  // an expired date of the same trip must not be offered
  await db.tripDeparture.create({
    data: { tripId: trip.id, code: "E2E-NIZZA-ALT", departAt: day(-3), status: "ON_SALE", capacity: 10, fares: { create: [{ code: "BASIC", name: "Basic", priceCents: 9900 }] }, stops: { create: [{ stopId: ham.id, sequence: 1, plannedAt: day(-3, 4) }] } },
  });

  // 2) sold out
  const sold = await db.trip.create({
    data: { ...base, slug: "e2e-ausgebucht", title: "E2E Ausgebuchte Reise", productType: "TRANSPORT_ONLY", destination: "Testort", summary: "Testreise ohne freie Plätze.", durationDays: 3 },
  });
  await db.tripDeparture.create({
    data: {
      tripId: sold.id,
      code: "E2E-VOLL-1",
      departAt: day(20),
      status: "ON_SALE",
      capacity: 2,
      soldCount: 2,
      fares: { create: [{ code: "BASIC", name: "Basic", priceCents: 9900 }] },
      stops: { create: [{ stopId: han.id, sequence: 1, plannedAt: day(20, 4) }] },
    },
  });

  // 3) no dates at all
  await db.trip.create({
    data: { ...base, slug: "e2e-ohne-termine", title: "E2E Reise ohne Termine", productType: "TRANSPORT_ONLY", destination: "Leerstadt", summary: "Testreise ohne Termine.", durationDays: 3, guideId: (await db.destination.findUniqueOrThrow({ where: { slug: "e2e-leer" } })).id },
  });
}

/**
 * Live tracking fixtures (test database only): a coach, a driver profile for the e2e driver account,
 * a confirmed run on the bookable test date and one paid booking with a known guest token.
 */
export async function seedE2eLive(db: PrismaClient, driverUserId: string, accessTokenHash: string) {
  const dep = await db.tripDeparture.findUniqueOrThrow({ where: { code: "E2E-NIZZA-1" }, include: { fares: true, stops: { orderBy: { sequence: "asc" } } } });
  const vehicle = await db.vehicle.create({ data: { internalNumber: "E2E-01", licensePlate: "H-E2E 1", manufacturer: "MAN", model: "Lion's Coach (Test)", seats: 50, vehicleClass: "REISEBUS", equipment: [] } });
  const driver = await db.driver.create({ data: { userId: driverUserId, firstName: "E2E", lastName: "Fahrer" } });
  const startsAt = new Date(dep.departAt.getTime() - 3600_000);
  const endsAt = dep.returnAt ?? new Date(dep.departAt.getTime() + 4 * 86400_000);
  const run = await db.run.create({
    data: {
      number: "F-E2E-00001",
      kind: "SCHEDULED_DEPARTURE",
      status: "CONFIRMED",
      departureId: dep.id,
      title: "E2E Testreise Nizza",
      startsAt,
      endsAt,
      originText: "Testhalt Hamburg ZOB",
      destinationText: "Nizza",
      requiredSeats: 1,
      vehicles: { create: { vehicleId: vehicle.id, startsAt, endsAt, status: "CONFIRMED" } },
      drivers: { create: { driverId: driver.id, startsAt, endsAt, status: "CONFIRMED" } },
    },
  });
  const fare = dep.fares[0]!;
  const stop = dep.stops[1] ?? dep.stops[0]!;
  const order = await db.order.create({
    data: {
      number: "MT-O-E2E-LIVE",
      email: "live@example.org",
      status: "PAID",
      subtotalCents: fare.priceCents,
      totalCents: fare.priceCents,
      accessTokenHash,
      consents: { terms: "test", privacy: "test" },
      paidAt: new Date(),
      bookings: {
        create: {
          number: "MT-E2E-LIVE",
          departureId: dep.id,
          fareId: fare.id,
          productType: "PACKAGE_TOUR",
          contactName: "Live Test",
          contactEmail: "live@example.org",
          status: "CONFIRMED",
          passengers: { create: { firstName: "Live", lastName: "Test", boardingStopId: stop.id } },
        },
      },
    },
  });
  await db.tripDeparture.update({ where: { id: dep.id }, data: { soldCount: { increment: 1 } } });
  return { runId: run.id, orderId: order.id };
}
