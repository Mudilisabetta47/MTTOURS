import { z } from "zod";
import type { Db, Tx } from "@/server/db/client";
import { audit } from "@/server/audit";
import { nextNumber } from "@/server/numbering";
import { randomToken, sha256Hex, safeEqual } from "@/server/auth/tokens";
import { convertHeldToSold, releaseHeld, reserveCapacity, SoldOutError } from "@/server/inventory/capacity";
import { quote, PricingError } from "./pricing";

/** Stripe requires a Checkout Session to live at least 30 minutes; the hold matches it. */
export const HOLD_MINUTES = 31;

const name = z.string().trim().min(1, "Bitte ausfüllen.").max(80);

export const CheckoutInput = z.object({
  departureCode: z.string().trim().min(3).max(80),
  fareCode: z.string().trim().min(1).max(40),
  boardingStopId: z.string().trim().min(1).max(64),
  passengers: z.array(z.object({ firstName: name, lastName: name })).min(1).max(20),
  options: z.array(z.object({ id: z.string().min(1).max(64), quantity: z.number().int().min(0).max(20) })).max(20).default([]),
  contact: z.object({
    firstName: name,
    lastName: name,
    email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse angeben.").max(254),
    phone: z.string().trim().min(6, "Bitte eine Telefonnummer angeben.").max(40).regex(/^[+0-9 ()/-]+$/, "Ungültige Telefonnummer."),
  }),
  consents: z.object({
    terms: z.literal(true, { message: "Bitte den Reisebedingungen zustimmen." }),
    privacy: z.literal(true, { message: "Bitte die Datenschutzhinweise bestätigen." }),
    packageInfo: z.boolean().default(false),
  }),
});
export type CheckoutData = z.infer<typeof CheckoutInput>;

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "not_on_sale" | "sold_out" | "invalid" | "package_info_missing",
  ) {
    super(message);
  }
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  bookingNumber: string;
  accessToken: string;
  totalCents: number;
  expiresAt: Date;
}

/**
 * Start a checkout: validate against the database, price on the server, reserve capacity and create
 * Order/OrderLines/Booking/Passengers/CapacityHold atomically. Nothing from the browser is trusted for prices.
 */
export async function startCheckout(db: Db, data: CheckoutData, meta: { ipHash: string | null; now?: Date }): Promise<CheckoutResult> {
  const now = meta.now ?? new Date();
  await expireStaleHolds(db, now);

  const dep = await db.tripDeparture.findUnique({
    where: { code: data.departureCode },
    include: {
      trip: { select: { id: true, status: true, productType: true, title: true, insolvencyCertificateRef: true } },
      fares: { where: { code: data.fareCode, isActive: true } },
      stops: { where: { id: data.boardingStopId }, include: { stop: true } },
    },
  });
  if (!dep || dep.trip.status !== "PUBLISHED") throw new CheckoutError("Diese Reise ist nicht verfügbar.", "not_found");
  if (dep.status !== "ON_SALE" || dep.departAt <= now || (dep.bookingDeadline && dep.bookingDeadline <= now)) {
    throw new CheckoutError("Für diesen Termin ist keine Buchung mehr möglich.", "not_on_sale");
  }
  const fare = dep.fares[0];
  const stop = dep.stops[0];
  if (!fare || fare.priceCents <= 0) throw new CheckoutError("Bitte einen gültigen Tarif wählen.", "invalid");
  if (!stop || stop.kind === "DROPOFF" || stop.kind === "WAYPOINT") throw new CheckoutError("Bitte einen gültigen Zustieg wählen.", "invalid");
  // A package tour must not be sold without insolvency protection (§ 651r BGB).
  if (dep.trip.productType === "PACKAGE_TOUR" && !dep.trip.insolvencyCertificateRef) {
    throw new CheckoutError("Diese Reise ist noch nicht online buchbar.", "not_on_sale");
  }
  if (dep.trip.productType === "PACKAGE_TOUR" && !data.consents.packageInfo) {
    throw new CheckoutError("Bitte bestätigen Sie den Erhalt des Formblatts zur Pauschalreise.", "package_info_missing");
  }

  const wanted = data.options.filter((o) => o.quantity > 0);
  const services = wanted.length
    ? await db.optionalService.findMany({ where: { id: { in: wanted.map((o) => o.id) }, tripId: dep.trip.id, isActive: true } })
    : [];
  if (services.length !== wanted.length) throw new CheckoutError("Eine Zusatzleistung ist nicht verfügbar.", "invalid");

  let price;
  try {
    price = quote({
      passengers: data.passengers.length,
      fare: { id: fare.id, name: fare.name, priceCents: fare.priceCents },
      boardingStop: { id: stop.id, name: stop.stop.name, surchargeCents: stop.surchargeCents },
      options: services.map((s) => ({
        id: s.id,
        name: s.name,
        priceCents: s.priceCents,
        unit: s.unit,
        quantity: Math.min(wanted.find((w) => w.id === s.id)!.quantity, s.maxPerBooking ?? 20),
      })),
    });
  } catch (e) {
    if (e instanceof PricingError) throw new CheckoutError(e.message, "invalid");
    throw e;
  }

  const accessToken = randomToken(32);
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const year = now.getUTCFullYear();
  const n = data.passengers.length;
  const stamp = now.toISOString();

  try {
    return await db.$transaction(async (tx) => {
      await reserveCapacity(tx, dep.id, n);
      const orderNumber = await nextNumber(tx, "ORDER", year);
      const bookingNumber = await nextNumber(tx, "BOOKING", year);
      const order = await tx.order.create({
        data: {
          number: orderNumber,
          email: data.contact.email,
          status: "PENDING_PAYMENT",
          subtotalCents: price.subtotalCents,
          discountCents: price.discountCents,
          feesCents: price.feesCents,
          totalCents: price.totalCents,
          accessTokenHash: sha256Hex(accessToken),
          consents: { terms: stamp, privacy: stamp, packageInfo: data.consents.packageInfo ? stamp : null, ipHash: meta.ipHash },
          expiresAt,
          lines: {
            create: price.lines.map((l) => ({
              kind: l.kind,
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              totalCents: l.totalCents,
              referenceType: l.referenceType,
              referenceId: l.referenceId,
            })),
          },
        },
      });
      await tx.booking.create({
        data: {
          number: bookingNumber,
          orderId: order.id,
          departureId: dep.id,
          fareId: fare.id,
          productType: dep.trip.productType,
          contactName: `${data.contact.firstName} ${data.contact.lastName}`,
          contactEmail: data.contact.email,
          contactPhone: data.contact.phone,
          passengers: {
            create: data.passengers.map((p) => ({ firstName: p.firstName, lastName: p.lastName, boardingStopId: stop.id })),
          },
        },
      });
      await tx.capacityHold.create({ data: { departureId: dep.id, orderId: order.id, quantity: n, expiresAt } });
      await audit(tx, {
        actorLabel: "website",
        action: "order.create",
        entityType: "Order",
        entityId: order.id,
        after: { number: orderNumber, departure: dep.code, passengers: n, totalCents: price.totalCents },
        ipHash: meta.ipHash,
      });
      return { orderId: order.id, orderNumber, bookingNumber, accessToken, totalCents: price.totalCents, expiresAt };
    });
  } catch (e) {
    if (e instanceof SoldOutError) throw new CheckoutError("Leider sind nicht mehr genug Plätze frei.", "sold_out");
    throw e;
  }
}

async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
  return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { holds: true, bookings: { include: { passengers: true } } } });
}

/** Release the reservation of an unpaid order. Safe to call repeatedly and concurrently. */
export async function expireOrder(db: Db, orderId: string, reason: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (order.status !== "PENDING_PAYMENT") return false;
    for (const h of order.holds.filter((x) => x.status === "ACTIVE")) {
      await releaseHeld(tx, h.departureId, h.quantity);
      await tx.capacityHold.update({ where: { id: h.id }, data: { status: "EXPIRED" } });
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "EXPIRED" } });
    await tx.booking.updateMany({ where: { orderId }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
    await tx.payment.updateMany({ where: { orderId, status: { in: ["CREATED", "PENDING"] } }, data: { status: "CANCELLED" } });
    await audit(tx, { actorLabel: "system", action: "order.expire", entityType: "Order", entityId: orderId, reason });
    return true;
  });
}

export async function expireStaleHolds(db: Db, now = new Date()): Promise<number> {
  const stale = await db.capacityHold.findMany({ where: { status: "ACTIVE", expiresAt: { lt: now } }, select: { orderId: true }, take: 200 });
  let n = 0;
  for (const h of stale) if (await expireOrder(db, h.orderId, "Reservierung abgelaufen")) n++;
  return n;
}

export type ConfirmResult = "confirmed" | "already_paid" | "needs_refund" | "amount_mismatch";

/**
 * Called only from a verified payment webhook. Turns the hold into sold seats, confirms the booking
 * and issues one ticket per passenger – all in one transaction.
 */
export async function confirmPaidOrder(
  db: Db,
  input: { orderId: string; provider: "STRIPE" | "PAYPAL"; providerRef: string; amountCents: number; currency: string },
): Promise<ConfirmResult> {
  return db.$transaction(async (tx) => {
    const order = await lockOrder(tx, input.orderId);
    const payment = await tx.payment.upsert({
      where: { provider_providerRef: { provider: input.provider, providerRef: input.providerRef } },
      create: { orderId: order.id, provider: input.provider, providerRef: input.providerRef, amountCents: input.amountCents, currency: input.currency.toUpperCase(), status: "PENDING" },
      update: {},
    });

    if (order.status === "PAID") return "already_paid";
    if (input.currency.toLowerCase() !== order.currency.toLowerCase() || input.amountCents !== order.totalCents) {
      await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: `Betrag/Währung weicht ab: ${input.amountCents} ${input.currency}` } });
      await audit(tx, { actorLabel: "payment-webhook", action: "payment.amount_mismatch", entityType: "Order", entityId: order.id, after: { amountCents: input.amountCents, expected: order.totalCents } });
      return "amount_mismatch";
    }

    const now = new Date();
    const booking = order.bookings[0];
    if (!booking) throw new Error("Order without booking");
    const n = booking.passengers.length;
    const activeHold = order.holds.find((h) => h.status === "ACTIVE");

    if (activeHold) {
      await convertHeldToSold(tx, activeHold.departureId, activeHold.quantity);
      await tx.capacityHold.update({ where: { id: activeHold.id }, data: { status: "CONVERTED" } });
    } else {
      // Paid after the reservation expired: try to get the seats again, otherwise refund.
      try {
        await reserveCapacity(tx, booking.departureId, n);
        await convertHeldToSold(tx, booking.departureId, n);
      } catch (e) {
        if (!(e instanceof SoldOutError)) throw e;
        await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", succeededAt: now } });
        await tx.refund.create({ data: { paymentId: payment.id, amountCents: input.amountCents, reason: "Zahlung nach Ablauf der Reservierung, Termin ausgebucht" } });
        await tx.notification.create({
          data: { channel: "EMAIL", recipient: "kundenservice@metours.de", template: "payment.refund.required", payload: { orderId: order.id }, relatedType: "Order", relatedId: order.id },
        });
        await audit(tx, { actorLabel: "payment-webhook", action: "payment.refund_required", entityType: "Order", entityId: order.id });
        return "needs_refund";
      }
    }

    await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", succeededAt: now, amountCents: input.amountCents } });
    await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: now } });
    await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", cancelledAt: null, cancelReason: null } });
    for (const p of booking.passengers) {
      const number = await nextNumber(tx, "TICKET", now.getUTCFullYear());
      await tx.ticket.create({ data: { number, passengerId: p.id, departureId: booking.departureId, qrTokenId: randomToken(18) } });
    }
    await tx.notification.create({
      data: { channel: "EMAIL", recipient: booking.contactEmail, template: "booking.confirmed", payload: { orderId: order.id, bookingNumber: booking.number }, relatedType: "Order", relatedId: order.id },
    });
    await audit(tx, { actorLabel: "payment-webhook", action: "order.paid", entityType: "Order", entityId: order.id, after: { provider: input.provider, amountCents: input.amountCents } });
    return "confirmed";
  });
}

/** Guest access: order id + secret token from the confirmation link. Never the booking number alone. */
export async function findOrderForGuest(db: Db, orderId: string, token: string) {
  if (!orderId || !token || token.length > 200) return null;
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      lines: true,
      bookings: {
        include: {
          departure: { include: { trip: { select: { title: true, slug: true, productType: true } } } },
          fare: { select: { name: true } },
          passengers: { include: { ticket: true, boardingStop: { include: { stop: true } } } },
        },
      },
    },
  });
  if (!order?.accessTokenHash || !safeEqual(order.accessTokenHash, sha256Hex(token))) return null;
  return order;
}
