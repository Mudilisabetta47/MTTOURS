import { z } from "zod";
import type { Db } from "@/server/db/client";
import { quote, PricingError, type PriceQuote } from "./pricing";

/** What a customer has chosen on the trip page – ids only, never prices. */
export const SelectionInput = z.object({
  departureCode: z.string().trim().min(3).max(80),
  fareCode: z.string().trim().min(1).max(40),
  boardingStopId: z.string().trim().min(1).max(64),
  passengers: z.number().int().min(1).max(20),
  options: z.array(z.object({ id: z.string().min(1).max(64), quantity: z.number().int().min(0).max(20) })).max(20).default([]),
});
export type Selection = z.infer<typeof SelectionInput>;

export type SelectionErrorCode = "not_found" | "not_on_sale" | "sold_out" | "invalid";

export class SelectionError extends Error {
  constructor(
    message: string,
    readonly code: SelectionErrorCode,
  ) {
    super(message);
  }
}

/**
 * Validate a selection against the database and price it. Used for the live price on the trip page
 * and again, unchanged, when the checkout starts – so the customer always sees the price they will pay.
 */
export async function resolveSelection(db: Db, sel: Selection, now = new Date()) {
  const dep = await db.tripDeparture.findUnique({
    where: { code: sel.departureCode },
    include: {
      trip: { select: { id: true, status: true, productType: true, title: true, insolvencyCertificateRef: true } },
      fares: { where: { code: sel.fareCode, isActive: true } },
      stops: { where: { id: sel.boardingStopId }, include: { stop: true } },
    },
  });
  if (!dep || dep.trip.status !== "PUBLISHED") throw new SelectionError("Diese Reise ist nicht verfügbar.", "not_found");
  if (dep.status !== "ON_SALE" || dep.departAt <= now || (dep.bookingDeadline && dep.bookingDeadline <= now)) {
    throw new SelectionError("Für diesen Termin ist keine Buchung mehr möglich.", "not_on_sale");
  }
  // A package tour must not be sold without insolvency protection (§ 651r BGB).
  if (dep.trip.productType === "PACKAGE_TOUR" && !dep.trip.insolvencyCertificateRef) {
    throw new SelectionError("Diese Reise ist noch nicht online buchbar.", "not_on_sale");
  }
  const fare = dep.fares[0];
  const stop = dep.stops[0];
  if (!fare || fare.priceCents <= 0) throw new SelectionError("Bitte einen gültigen Tarif wählen.", "invalid");
  if (!stop || stop.kind === "DROPOFF" || stop.kind === "WAYPOINT") throw new SelectionError("Bitte einen gültigen Zustieg wählen.", "invalid");

  const seatsLeft = dep.capacity - dep.soldCount - dep.heldCount;
  if (seatsLeft <= 0) throw new SelectionError("Dieser Termin ist ausgebucht.", "sold_out");
  if (sel.passengers > seatsLeft) {
    throw new SelectionError(`Für diesen Termin ${seatsLeft === 1 ? "ist nur noch 1 Platz" : `sind nur noch ${seatsLeft} Plätze`} frei.`, "sold_out");
  }

  const wanted = sel.options.filter((o) => o.quantity > 0);
  const services = wanted.length
    ? await db.optionalService.findMany({ where: { id: { in: wanted.map((o) => o.id) }, tripId: dep.trip.id, isActive: true } })
    : [];
  if (services.length !== wanted.length) throw new SelectionError("Eine Zusatzleistung ist nicht verfügbar.", "invalid");

  let price: PriceQuote;
  try {
    price = quote({
      passengers: sel.passengers,
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
    if (e instanceof PricingError) throw new SelectionError(e.message, "invalid");
    throw e;
  }
  return { dep, fare, stop, services, price, seatsLeft };
}
