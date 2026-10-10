import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { CheckoutError, confirmPaidOrder, expireOrder, startCheckout, type CheckoutData } from "@/server/booking/checkout";
import { processStripeEvent } from "@/server/payments/stripe";
import { resolveSelection, SelectionError } from "@/server/booking/selection";
import { getPublishedTrip } from "@/server/catalog/trips";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

async function seed(opts: { capacity?: number; productType?: "TRANSPORT_ONLY" | "PACKAGE_TOUR"; certificate?: string | null } = {}) {
  const trip = await db.trip.create({
    data: {
      slug: `t-${Math.random().toString(36).slice(2, 8)}`,
      title: "Wochenende in Testhausen",
      productType: opts.productType ?? "TRANSPORT_ONLY",
      status: "PUBLISHED",
      countryCode: "NL",
      destination: "Testhausen",
      summary: "Test",
      description: [],
      durationDays: 3,
      insolvencyCertificateRef: opts.certificate ?? null,
    },
  });
  const stop = await db.stop.create({ data: { name: `Hannover ZOB ${trip.slug}`, city: "Hannover" } });
  const dep = await db.tripDeparture.create({
    data: {
      tripId: trip.id,
      code: `TEST-${trip.slug}`,
      departAt: new Date(Date.now() + 40 * 86400_000),
      status: "ON_SALE",
      capacity: opts.capacity ?? 3,
      fares: { create: [{ code: "SMART", name: "Smart", priceCents: 29900 }] },
      stops: { create: [{ stopId: stop.id, sequence: 1, plannedAt: new Date(Date.now() + 40 * 86400_000), surchargeCents: 1900 }] },
    },
    include: { stops: true },
  });
  const option = await db.optionalService.create({ data: { tripId: trip.id, name: "Reiserücktritt", priceCents: 3900, unit: "PER_PERSON" } });
  return { trip, dep, stopId: dep.stops[0]!.id, option };
}

const input = (code: string, stopId: string, n = 2, extra: Partial<CheckoutData> = {}): CheckoutData => ({
  departureCode: code,
  fareCode: "SMART",
  boardingStopId: stopId,
  passengers: Array.from({ length: n }, (_, i) => ({ firstName: `Vor${i}`, lastName: "Name" })),
  options: [],
  contact: { firstName: "Erika", lastName: "Beispiel", email: "erika@example.org", phone: "0511 123456" },
  consents: { terms: true, privacy: true, packageInfo: true },
  ...extra,
});

describe("checkout", () => {
  it("prices on the server and reserves capacity atomically", async () => {
    const { dep, stopId, option } = await seed();
    const r = await startCheckout(db, input(dep.code, stopId, 2, { options: [{ id: option.id, quantity: 2 }] }), { ipHash: null });
    expect(r.totalCents).toBe(2 * 29900 + 2 * 1900 + 2 * 3900);
    const order = await db.order.findUniqueOrThrow({ where: { id: r.orderId }, include: { lines: true, holds: true } });
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.lines).toHaveLength(3);
    expect(order.holds[0]!.quantity).toBe(2);
    expect((await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } })).heldCount).toBe(2);
  });

  it("rejects optional services of another trip", async () => {
    const a = await seed();
    const b = await seed();
    await expect(startCheckout(db, input(a.dep.code, a.stopId, 1, { options: [{ id: b.option.id, quantity: 1 }] }), { ipHash: null })).rejects.toBeInstanceOf(CheckoutError);
  });

  it("never oversells, even with concurrent checkouts", async () => {
    const { dep, stopId } = await seed({ capacity: 3 });
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => startCheckout(db, input(dep.code, stopId, 1), { ipHash: null })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const d = await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } });
    expect(d.heldCount + d.soldCount).toBe(3);
  });

  it("does not sell a package tour without insolvency protection", async () => {
    const { dep, stopId } = await seed({ productType: "PACKAGE_TOUR" });
    await expect(startCheckout(db, input(dep.code, stopId, 1), { ipHash: null })).rejects.toMatchObject({ code: "not_on_sale" });
  });
});

describe("live price (resolveSelection)", () => {
  const sel = (code: string, stopId: string, extra: Record<string, unknown> = {}) => ({ departureCode: code, fareCode: "SMART", boardingStopId: stopId, passengers: 2, options: [], ...extra });

  it("includes the pickup surcharge and matches the checkout total", async () => {
    const { dep, stopId, option } = await seed();
    const r = await resolveSelection(db, sel(dep.code, stopId, { options: [{ id: option.id, quantity: 2 }] }));
    expect(r.price.totalCents).toBe(2 * 29900 + 2 * 1900 + 2 * 3900);
    expect(r.price.lines.map((l) => l.kind)).toEqual(["FARE", "STOP_SURCHARGE", "OPTIONAL_SERVICE"]);
  });

  it("rejects an unknown tariff, an expired date and more travellers than seats", async () => {
    const { dep, stopId } = await seed({ capacity: 3 });
    await expect(resolveSelection(db, sel(dep.code, stopId, { fareCode: "FAKE" }))).rejects.toThrow(SelectionError);
    await expect(resolveSelection(db, sel(dep.code, stopId, { passengers: 4 }))).rejects.toMatchObject({ code: "sold_out" });
    await db.tripDeparture.update({ where: { id: dep.id }, data: { departAt: new Date(Date.now() - 86400_000) } });
    await expect(resolveSelection(db, sel(dep.code, stopId))).rejects.toMatchObject({ code: "not_on_sale" });
  });
});

describe("trip page state", () => {
  it("derives BOOKABLE / SOLD_OUT / COMING_SOON from the database", async () => {
    const { trip, dep } = await seed({ capacity: 2 });
    expect((await getPublishedTrip(db, trip.slug))!.state).toBe("BOOKABLE");
    await db.tripDeparture.update({ where: { id: dep.id }, data: { soldCount: 2 } });
    expect((await getPublishedTrip(db, trip.slug))!.state).toBe("SOLD_OUT");
    await db.tripDeparture.update({ where: { id: dep.id }, data: { status: "CANCELLED" } });
    expect((await getPublishedTrip(db, trip.slug))!.state).toBe("CANCELLED");
    await db.tripDeparture.update({ where: { id: dep.id }, data: { departAt: new Date(Date.now() - 86400_000) } });
    expect((await getPublishedTrip(db, trip.slug))!.state).toBe("COMING_SOON");
  });

  it("keeps an unprotected package tour in COMING_SOON even with dates", async () => {
    const { trip } = await seed({ productType: "PACKAGE_TOUR", certificate: null });
    const t = await getPublishedTrip(db, trip.slug);
    expect(t!.state).toBe("COMING_SOON");
    expect(t!.lockReason).toBe("package_unprotected");
    expect(t!.departures).toEqual([]);
  });
});

describe("payment confirmation", () => {
  it("confirms exactly once and issues one ticket per traveller", async () => {
    const { dep, stopId } = await seed();
    const r = await startCheckout(db, input(dep.code, stopId, 2), { ipHash: null });
    const pay = { orderId: r.orderId, provider: "STRIPE" as const, providerRef: "cs_test_1", amountCents: r.totalCents, currency: "eur" };
    expect(await confirmPaidOrder(db, pay)).toBe("confirmed");
    expect(await confirmPaidOrder(db, pay)).toBe("already_paid");
    expect(await db.ticket.count()).toBe(2);
    const d = await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } });
    expect([d.soldCount, d.heldCount]).toEqual([2, 0]);
    expect((await db.booking.findFirstOrThrow()).status).toBe("CONFIRMED");
  });

  it("rejects a payment with the wrong amount", async () => {
    const { dep, stopId } = await seed();
    const r = await startCheckout(db, input(dep.code, stopId, 1), { ipHash: null });
    expect(await confirmPaidOrder(db, { orderId: r.orderId, provider: "STRIPE", providerRef: "cs_x", amountCents: 100, currency: "eur" })).toBe("amount_mismatch");
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("PENDING_PAYMENT");
    expect(await db.ticket.count()).toBe(0);
  });

  it("a late payment after expiry refunds instead of overbooking", async () => {
    const { dep, stopId } = await seed({ capacity: 1 });
    const r = await startCheckout(db, input(dep.code, stopId, 1), { ipHash: null });
    expect(await expireOrder(db, r.orderId, "test")).toBe(true);
    expect((await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } })).heldCount).toBe(0);
    const other = await startCheckout(db, input(dep.code, stopId, 1, { contact: { firstName: "B", lastName: "B", email: "b@example.org", phone: "0511 999999" } }), { ipHash: null });
    await confirmPaidOrder(db, { orderId: other.orderId, provider: "STRIPE", providerRef: "cs_b", amountCents: other.totalCents, currency: "eur" });
    const late = await confirmPaidOrder(db, { orderId: r.orderId, provider: "STRIPE", providerRef: "cs_a", amountCents: r.totalCents, currency: "eur" });
    expect(late).toBe("needs_refund");
    expect(await db.refund.count()).toBe(1);
    expect((await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } })).soldCount).toBe(1);
  });
});

describe("stripe webhook", () => {
  const secret = "whsec_test_secret_for_unit_tests_only";
  const stripe = new Stripe("sk_test_dummy");

  function signed(event: object) {
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    return { payload, header };
  }

  it("verifies signatures and processes each event once", async () => {
    const { dep, stopId } = await seed();
    const r = await startCheckout(db, input(dep.code, stopId, 2), { ipHash: null });
    const event = {
      id: "evt_test_1",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_42", object: "checkout.session", payment_status: "paid", amount_total: r.totalCents, currency: "eur", metadata: { orderId: r.orderId }, client_reference_id: r.orderId } },
    };
    const { payload, header } = signed(event);
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_wrong")).toThrow();
    const verified = stripe.webhooks.constructEvent(payload, header, secret);

    expect(await processStripeEvent(db, verified)).toBe("processed");
    expect(await processStripeEvent(db, verified)).toBe("duplicate");
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("PAID");
    expect(await db.ticket.count()).toBe(2);
    expect(await db.payment.count({ where: { status: "SUCCEEDED" } })).toBe(1);
  });

  it("an expired checkout session releases the seats", async () => {
    const { dep, stopId } = await seed();
    const r = await startCheckout(db, input(dep.code, stopId, 2), { ipHash: null });
    const ev = stripe.webhooks.constructEvent(
      ...((): [string, string, string] => {
        const s = signed({ id: "evt_exp", object: "event", type: "checkout.session.expired", data: { object: { id: "cs_e", object: "checkout.session", metadata: { orderId: r.orderId } } } });
        return [s.payload, s.header, secret];
      })(),
    );
    await processStripeEvent(db, ev);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("EXPIRED");
    expect((await db.tripDeparture.findUniqueOrThrow({ where: { id: dep.id } })).heldCount).toBe(0);
  });
});
