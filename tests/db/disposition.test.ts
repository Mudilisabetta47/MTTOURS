import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

async function setup() {
  const vehicle = await db.vehicle.create({
    data: { internalNumber: "T-01", licensePlate: "H-TEST 1", manufacturer: "Test", model: "Test", seats: 50, vehicleClass: "REISEBUS" },
  });
  const driver = await db.driver.create({ data: { firstName: "Test", lastName: "Fahrer" } });
  const mkRun = (n: string, from: string, to: string) =>
    db.run.create({
      data: { number: n, kind: "CHARTER", title: n, startsAt: new Date(from), endsAt: new Date(to), originText: "A", destinationText: "B", requiredSeats: 40 },
    });
  return { vehicle, driver, mkRun };
}

describe("disposition conflicts are prevented by the database", () => {
  it("rejects overlapping vehicle assignments, allows adjacent and cancelled ones", async () => {
    const { vehicle, mkRun } = await setup();
    const r1 = await mkRun("F1", "2027-05-01T06:00:00Z", "2027-05-01T14:00:00Z");
    const r2 = await mkRun("F2", "2027-05-01T12:00:00Z", "2027-05-01T18:00:00Z");
    const r3 = await mkRun("F3", "2027-05-01T14:00:00Z", "2027-05-01T20:00:00Z");

    await db.vehicleAssignment.create({ data: { runId: r1.id, vehicleId: vehicle.id, startsAt: r1.startsAt, endsAt: r1.endsAt } });
    await expect(
      db.vehicleAssignment.create({ data: { runId: r2.id, vehicleId: vehicle.id, startsAt: r2.startsAt, endsAt: r2.endsAt } }),
    ).rejects.toThrow();
    // touching intervals [06–14) and [14–20) do not overlap
    await expect(
      db.vehicleAssignment.create({ data: { runId: r3.id, vehicleId: vehicle.id, startsAt: r3.startsAt, endsAt: r3.endsAt } }),
    ).resolves.toBeTruthy();
    // a cancelled assignment does not block
    await expect(
      db.vehicleAssignment.create({
        data: { runId: r2.id, vehicleId: vehicle.id, startsAt: r2.startsAt, endsAt: r2.endsAt, status: "CANCELLED" },
      }),
    ).resolves.toBeTruthy();
  });

  it("rejects a driver assigned to two overlapping runs, even concurrently", async () => {
    const { driver, mkRun } = await setup();
    const a = await mkRun("F1", "2027-05-02T06:00:00Z", "2027-05-02T15:00:00Z");
    const b = await mkRun("F2", "2027-05-02T10:00:00Z", "2027-05-02T19:00:00Z");
    const results = await Promise.allSettled(
      [a, b].map((r) => db.driverAssignment.create({ data: { runId: r.id, driverId: driver.id, startsAt: r.startsAt, endsAt: r.endsAt } })),
    );
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });

  it("rejects runs that end before they start", async () => {
    const { mkRun } = await setup();
    await expect(mkRun("F9", "2027-05-03T10:00:00Z", "2027-05-03T09:00:00Z")).rejects.toThrow();
  });
});
