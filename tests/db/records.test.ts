import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { nextNumber } from "@/server/numbering";
import { audit } from "@/server/audit";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

describe("number sequences", () => {
  it("are unique and gapless under concurrency", async () => {
    const numbers = await Promise.all(
      Array.from({ length: 30 }, () => db.$transaction((tx) => nextNumber(tx, "INVOICE", 2027))),
    );
    const values = numbers.map((n) => Number(n.split("-")[2])).sort((a, b) => a - b);
    expect(values).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("a rolled-back transaction does not consume a number", async () => {
    await db.$transaction((tx) => nextNumber(tx, "INVOICE", 2028));
    await expect(
      db.$transaction(async (tx) => {
        await nextNumber(tx, "INVOICE", 2028);
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect(await db.$transaction((tx) => nextNumber(tx, "INVOICE", 2028))).toBe("RE-2028-00002");
  });
});

describe("audit log", () => {
  it("is append-only", async () => {
    await audit(db, { actorLabel: "test", action: "test.write", entityType: "Test", entityId: "1" });
    const row = await db.auditLog.findFirstOrThrow();
    await expect(db.auditLog.update({ where: { id: row.id }, data: { action: "tampered" } })).rejects.toThrow();
    await expect(db.auditLog.delete({ where: { id: row.id } })).rejects.toThrow();
  });

  it("is rolled back together with the business change", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await audit(tx, { actorLabel: "test", action: "booking.cancel", entityType: "Booking", entityId: "b1" });
        throw new Error("business failure");
      }),
    ).rejects.toThrow();
    expect(await db.auditLog.count()).toBe(0);
  });
});

describe("invoices", () => {
  it("cannot be changed once issued", async () => {
    const inv = await db.invoice.create({
      data: {
        billingAddress: { name: "Test GmbH" },
        lines: {
          create: [{ sort: 1, description: "Busfahrt", quantity: 1, unitNetCents: 10000, taxRateBp: 1900, netCents: 10000, taxCents: 1900, grossCents: 11900 }],
        },
        netCents: 10000,
        taxCents: 1900,
        grossCents: 11900,
      },
    });
    await db.invoice.update({ where: { id: inv.id }, data: { status: "ISSUED", number: "RE-2027-00001", issueDate: new Date() } });
    await expect(db.invoice.update({ where: { id: inv.id }, data: { grossCents: 1 } })).rejects.toThrow();
    await expect(
      db.invoiceLine.create({
        data: { invoiceId: inv.id, sort: 2, description: "Nachtrag", quantity: 1, unitNetCents: 1, taxRateBp: 1900, netCents: 1, taxCents: 0, grossCents: 1 },
      }),
    ).rejects.toThrow();
    await expect(db.invoice.delete({ where: { id: inv.id } })).rejects.toThrow();
    // payment status may still change
    await expect(db.invoice.update({ where: { id: inv.id }, data: { status: "PAID", paidCents: 11900 } })).resolves.toBeTruthy();
  });

  it("an issued invoice needs a number", async () => {
    await expect(
      db.invoice.create({ data: { status: "ISSUED", billingAddress: {}, netCents: 0, taxCents: 0, grossCents: 0 } }),
    ).rejects.toThrow();
  });
});

describe("inquiries", () => {
  it("keep their original payload unchanged and reject duplicates", async () => {
    const data = {
      number: "ANF-2027-00001",
      source: "test",
      tripType: "Tagesfahrt",
      originalPayload: { from: "Hannover", to: "Harz" },
      contactName: "Test",
      contactEmail: "t@example.org",
      dedupeKey: "k1",
    };
    const inq = await db.inquiry.create({ data });
    await expect(db.inquiry.update({ where: { id: inq.id }, data: { originalPayload: { from: "X" } } })).rejects.toThrow();
    await expect(db.inquiry.update({ where: { id: inq.id }, data: { status: "CONTACTED" } })).resolves.toBeTruthy();
    await expect(db.inquiry.create({ data: { ...data, number: "ANF-2027-00002" } })).rejects.toThrow();
  });
});
