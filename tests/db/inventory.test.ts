import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { reserveCapacity, SoldOutError } from "@/server/inventory/capacity";
import { seedDeparture, testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

describe("capacity inventory", () => {
  it("never sells more places than capacity under 40 concurrent checkouts", async () => {
    const dep = await seedDeparture(db, { capacity: 10 });
    const results = await Promise.allSettled(
      Array.from({ length: 40 }, () => db.$transaction((tx) => reserveCapacity(tx, dep.id, 1))),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const soldOut = results.filter((r) => r.status === "rejected" && r.reason instanceof SoldOutError).length;
    expect(ok).toBe(10);
    expect(soldOut).toBe(30);
    const after = await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } });
    expect(after.heldCount).toBe(10);
  });

  it("multi-seat requests are all-or-nothing", async () => {
    const dep = await seedDeparture(db, { capacity: 5 });
    await db.$transaction((tx) => reserveCapacity(tx, dep.id, 3));
    await expect(db.$transaction((tx) => reserveCapacity(tx, dep.id, 3))).rejects.toBeInstanceOf(SoldOutError);
    const after = await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } });
    expect(after.heldCount).toBe(3);
  });

  it("does not sell departures that are not on sale", async () => {
    const dep = await seedDeparture(db, { capacity: 50, status: "DRAFT" });
    await expect(db.$transaction((tx) => reserveCapacity(tx, dep.id, 1))).rejects.toBeInstanceOf(SoldOutError);
  });

  it("the database itself rejects an oversold departure (CHECK constraint)", async () => {
    const dep = await seedDeparture(db, { capacity: 2 });
    await expect(db.tripDeparture.update({ where: { id: dep.id }, data: { soldCount: 3 } })).rejects.toThrow();
  });

  it("a seat cannot be held twice for the same departure", async () => {
    const dep = await seedDeparture(db, { capacity: 50 });
    const layout = await db.seatLayout.create({
      data: { name: "Test 2+2", rows: 1, columns: 5, seats: { create: [{ label: "1A", row: 1, col: 1 }] } },
      include: { seats: true },
    });
    const seat = layout.seats[0]!;
    const orders = await Promise.all(
      [1, 2].map((i) => db.order.create({ data: { number: `O-${i}`, email: `t${i}@example.org`, consents: {} } })),
    );
    const attempts = await Promise.allSettled(
      orders.map((o) =>
        db.seatReservation.create({ data: { departureId: dep.id, seatId: seat.id, orderId: o.id, status: "HELD" } }),
      ),
    );
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);

    // Once released, the seat can be taken again.
    await db.seatReservation.updateMany({ where: { departureId: dep.id }, data: { status: "RELEASED" } });
    await expect(
      db.seatReservation.create({ data: { departureId: dep.id, seatId: seat.id, orderId: orders[0]!.id, status: "HELD" } }),
    ).resolves.toBeTruthy();
  });

  it("order totals must be internally consistent", async () => {
    await expect(
      db.order.create({
        data: { number: "O-X", email: "x@example.org", consents: {}, subtotalCents: 10000, discountCents: 0, feesCents: 0, totalCents: 9000 },
      }),
    ).rejects.toThrow();
  });
});
