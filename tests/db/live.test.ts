import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createRunForDeparture, endRun, liveForOrder, LiveError, recordPosition, startRun } from "@/server/live/tracking";
import { sha256Hex } from "@/server/auth/tokens";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

async function setup(seats = 50) {
  const office = await db.user.create({ data: { email: `o-${Date.now()}@example.org`, displayName: "Disposition" } });
  const du = await db.user.create({ data: { email: `d-${Date.now()}@example.org`, displayName: "Erika Fahrer", roles: { create: [{ role: "DRIVER" }] } } });
  const other = await db.user.create({ data: { email: `x-${Date.now()}@example.org`, displayName: "Fremd Fahrer", roles: { create: [{ role: "DRIVER" }] } } });
  const driver = await db.driver.create({ data: { userId: du.id, firstName: "Erika", lastName: "Fahrer" } });
  await db.driver.create({ data: { userId: other.id, firstName: "Fremd", lastName: "Fahrer" } });
  const stop = await db.stop.create({ data: { name: "Hannover ZOB", city: "Hannover", latitude: 52.3795, longitude: 9.7364 } });
  const trip = await db.trip.create({ data: { slug: "live-test", title: "Live Test", productType: "TRANSPORT_ONLY", status: "PUBLISHED", countryCode: "DK", destination: "Kopenhagen", summary: "x", description: [], durationDays: 3 } });
  const dep = await db.tripDeparture.create({
    data: {
      tripId: trip.id,
      code: "LIVE-1",
      departAt: new Date(Date.now() + 2 * 86400_000),
      status: "ON_SALE",
      capacity: 40,
      fares: { create: [{ code: "BASIC", name: "Basic", priceCents: 9900 }] },
      stops: { create: [{ stopId: stop.id, sequence: 1, plannedAt: new Date(Date.now() + 2 * 86400_000) }] },
    },
    include: { fares: true, stops: true },
  });
  const vehicle = await db.vehicle.create({ data: { internalNumber: "01", licensePlate: "H-MT 1", manufacturer: "MAN", model: "Lion's Coach", seats, vehicleClass: "REISEBUS", equipment: [] } });
  return { office, du, other, driver, dep, vehicle };
}

describe("live tracking", () => {
  it("refuses a vehicle smaller than the departure", async () => {
    const { office, driver, dep, vehicle } = await setup(30);
    await expect(createRunForDeparture(db, office, { departureId: dep.id, vehicleId: vehicle.id, driverId: driver.id })).rejects.toThrow(LiveError);
  });

  it("only the assigned driver may send positions, only during the run, throttled", async () => {
    const { office, du, other, driver, dep, vehicle } = await setup();
    const run = await createRunForDeparture(db, office, { departureId: dep.id, vehicleId: vehicle.id, driverId: driver.id });
    const pos = (at: number) => ({ runId: run.id, lat: 52.4, lng: 9.7, accuracy: 10, speed: 20, heading: 90, at });
    const now = Date.now();

    await expect(recordPosition(db, du, pos(now))).rejects.toThrow("Bitte zuerst");
    await expect(startRun(db, other, run.id)).rejects.toThrow("nicht zugeordnet");
    await startRun(db, du, run.id);
    await expect(recordPosition(db, other, pos(now))).rejects.toThrow("nicht zugeordnet");
    await expect(recordPosition(db, du, pos(now + 5 * 60_000))).rejects.toThrow("Zeitstempel");

    expect(await recordPosition(db, du, pos(now))).toBe("stored");
    expect(await recordPosition(db, du, pos(now + 2000))).toBe("throttled");
    expect(await recordPosition(db, du, pos(now + 6000))).toBe("stored");
    const p = await db.vehiclePosition.findFirstOrThrow({ where: { runId: run.id }, orderBy: { recordedAt: "desc" } });
    expect(p).toMatchObject({ source: "DRIVER_APP", speedKmh: 72, vehicleId: vehicle.id });
  });

  it("customers see their bus only with a paid booking; old positions are marked stale; finished runs say so", async () => {
    const { office, du, driver, dep, vehicle } = await setup();
    const run = await createRunForDeparture(db, office, { departureId: dep.id, vehicleId: vehicle.id, driverId: driver.id });
    const token = "guest-token-for-live-test";
    const order = await db.order.create({
      data: {
        number: "O-1",
        email: "k@example.org",
        status: "PENDING_PAYMENT",
        subtotalCents: 9900,
        totalCents: 9900,
        accessTokenHash: sha256Hex(token),
        consents: {},
        bookings: { create: { number: "B-1", departureId: dep.id, fareId: dep.fares[0]!.id, productType: "TRANSPORT_ONLY", contactName: "K", contactEmail: "k@example.org", passengers: { create: { firstName: "K", lastName: "L", boardingStopId: dep.stops[0]!.id } } } },
      },
    });
    await startRun(db, du, run.id);
    const t0 = Date.now();
    await recordPosition(db, du, { runId: run.id, lat: 52.5, lng: 9.7364, at: t0 });

    expect(await liveForOrder(db, order.id, token)).toEqual({ state: "none" }); // unpaid
    await db.order.update({ where: { id: order.id }, data: { status: "PAID" } });
    expect(await liveForOrder(db, order.id, "wrong")).toEqual({ state: "none" });

    const v = await liveForOrder(db, order.id, token);
    expect(v.state).toBe("live");
    if (v.state === "live") expect(v.crowMeters).toBeGreaterThan(13_000);

    const later = await liveForOrder(db, order.id, token, new Date(t0 + 11 * 60_000));
    expect(later.state).toBe("stale");

    await endRun(db, du, run.id);
    expect(await liveForOrder(db, order.id, token)).toEqual({ state: "finished" });
  });
});
