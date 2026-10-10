import { sumCents, type Cents } from "@/lib/money";

/** Everything the price depends on – loaded from the database, never from the browser. */
export interface PricingInput {
  passengers: number;
  fare: { id: string; name: string; priceCents: Cents };
  boardingStop: { id: string; name: string; surchargeCents: Cents };
  options: { id: string; name: string; priceCents: Cents; unit: "PER_PERSON" | "PER_BOOKING"; quantity: number }[];
}

export interface PriceLine {
  kind: "FARE" | "STOP_SURCHARGE" | "OPTIONAL_SERVICE";
  description: string;
  quantity: number;
  unitPriceCents: Cents;
  totalCents: Cents;
  referenceType: string;
  referenceId: string;
}

export interface PriceQuote {
  lines: PriceLine[];
  subtotalCents: Cents;
  discountCents: Cents;
  feesCents: Cents;
  totalCents: Cents;
}

export class PricingError extends Error {}

/** Pure, deterministic price calculation in integer cents. Rounding cannot occur (no percentages here). */
export function quote(input: PricingInput): PriceQuote {
  const n = input.passengers;
  if (!Number.isInteger(n) || n < 1 || n > 20) throw new PricingError("Anzahl Reisende ungültig");
  if (!Number.isSafeInteger(input.fare.priceCents) || input.fare.priceCents <= 0) throw new PricingError("Tarif ohne gültigen Preis");

  const lines: PriceLine[] = [
    {
      kind: "FARE",
      description: `Tarif ${input.fare.name}`,
      quantity: n,
      unitPriceCents: input.fare.priceCents,
      totalCents: n * input.fare.priceCents,
      referenceType: "DepartureFare",
      referenceId: input.fare.id,
    },
  ];
  if (input.boardingStop.surchargeCents > 0) {
    lines.push({
      kind: "STOP_SURCHARGE",
      description: `Zustieg ${input.boardingStop.name}`,
      quantity: n,
      unitPriceCents: input.boardingStop.surchargeCents,
      totalCents: n * input.boardingStop.surchargeCents,
      referenceType: "DepartureStop",
      referenceId: input.boardingStop.id,
    });
  }
  for (const o of input.options) {
    if (o.quantity <= 0) continue;
    const qty = o.unit === "PER_PERSON" ? Math.min(o.quantity, n) : 1;
    lines.push({
      kind: "OPTIONAL_SERVICE",
      description: o.name,
      quantity: qty,
      unitPriceCents: o.priceCents,
      totalCents: qty * o.priceCents,
      referenceType: "OptionalService",
      referenceId: o.id,
    });
  }
  const subtotalCents = sumCents(lines.map((l) => l.totalCents));
  return { lines, subtotalCents, discountCents: 0, feesCents: 0, totalCents: subtotalCents };
}
