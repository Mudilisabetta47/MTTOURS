import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createWebsiteInquiry, InquiryInput } from "@/server/sales/inquiry";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

const future = new Date(Date.now() + 20 * 86400_000).toISOString().slice(0, 10);
const valid = {
  anlass: "klassenfahrt",
  datum: future,
  start: "Grundschule Musterweg, Hannover",
  ziel: "Serengeti-Park Hodenhagen",
  personen: "48",
  gepaeck: "handgepaeck",
  rueckfahrt: false,
  fahrzeugklasse: "egal",
  name: "Erika Beispiel",
  email: "Erika.Beispiel@Example.org",
  datenschutz: true,
};

describe("website inquiry", () => {
  it("validates input on the server", () => {
    expect(InquiryInput.safeParse(valid).success).toBe(true);
    expect(InquiryInput.safeParse({ ...valid, datenschutz: false }).success).toBe(false);
    expect(InquiryInput.safeParse({ ...valid, datum: "2020-01-01" }).success).toBe(false);
    expect(InquiryInput.safeParse({ ...valid, personen: "0" }).success).toBe(false);
    expect(InquiryInput.safeParse({ ...valid, rueckfahrt: true }).success).toBe(false); // return date missing
    expect(InquiryInput.safeParse({ ...valid, anlass: "<script>" }).success).toBe(false);
  });

  it("stores the original request, numbers it and queues a staff notification", async () => {
    const data = InquiryInput.parse(valid);
    const res = await createWebsiteInquiry(db, data, { source: "test", ipHash: "ip-a" });
    expect(res).toMatchObject({ ok: true, duplicate: false });
    if (!res.ok) return;
    expect(res.number).toMatch(/^ANF-\d{4}-00001$/);
    const inq = await db.inquiry.findUniqueOrThrow({ where: { number: res.number } });
    expect(inq.status).toBe("NEW");
    expect(inq.contactEmail).toBe("erika.beispiel@example.org");
    expect((inq.originalPayload as { ziel: string }).ziel).toBe(valid.ziel);
    expect(await db.notification.count({ where: { relatedId: inq.id, status: "QUEUED" } })).toBe(1);
    expect(await db.auditLog.count({ where: { entityId: inq.id, action: "inquiry.create" } })).toBe(1);
  });

  it("does not create duplicates on double submit, even concurrently", async () => {
    const data = InquiryInput.parse(valid);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createWebsiteInquiry(db, data, { source: "test", ipHash: null })),
    );
    expect(await db.inquiry.count()).toBe(1);
    const numbers = new Set(results.map((r) => (r.ok ? r.number : "")));
    expect(numbers.size).toBe(1);
  });

  it("rate-limits floods from one address", async () => {
    let last;
    for (let i = 0; i < 6; i++) {
      last = await createWebsiteInquiry(db, InquiryInput.parse({ ...valid, personen: String(10 + i) }), { source: "test", ipHash: "ip-flood" });
    }
    expect(last).toEqual({ ok: false, reason: "rate_limited" });
    expect(await db.inquiry.count()).toBe(5);
  });
});
