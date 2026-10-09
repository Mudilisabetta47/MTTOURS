/**
 * Money is always handled as integer minor units (cents).
 * Floats never touch a price. Rounding happens exactly once, explicitly.
 */

export type Cents = number;

export function assertCents(value: number, label = "amount"): Cents {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label} must be an integer number of cents`);
  return value;
}

/** Commercial rounding (half away from zero) of a rational cents value. */
export function roundHalfAwayFromZero(value: number): Cents {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Tax contained in a gross amount: gross * rate / (10000 + rate), rate in basis points. */
export function taxFromGross(grossCents: Cents, rateBp: number): Cents {
  assertCents(grossCents, "grossCents");
  if (!Number.isInteger(rateBp) || rateBp < 0) throw new RangeError("rateBp must be a non-negative integer");
  // integer arithmetic: multiply first, divide once
  return roundHalfAwayFromZero((grossCents * rateBp) / (10000 + rateBp));
}

/** Tax on a net amount. */
export function taxFromNet(netCents: Cents, rateBp: number): Cents {
  assertCents(netCents, "netCents");
  if (!Number.isInteger(rateBp) || rateBp < 0) throw new RangeError("rateBp must be a non-negative integer");
  return roundHalfAwayFromZero((netCents * rateBp) / 10000);
}

/** Percentage of an amount, percentage given in basis points (1000 = 10 %). */
export function percentOf(amountCents: Cents, bp: number): Cents {
  assertCents(amountCents);
  return roundHalfAwayFromZero((amountCents * bp) / 10000);
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + assertCents(v), 0);
}

/**
 * Split an amount into n parts that add up exactly (largest remainder).
 * Used e.g. to distribute a discount across passengers.
 */
export function allocate(totalCents: Cents, weights: readonly number[]): Cents[] {
  assertCents(totalCents);
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (weightSum <= 0) throw new RangeError("weights must sum to a positive number");
  const raw = weights.map((w) => (totalCents * w) / weightSum);
  const floored = raw.map((r) => Math.floor(r));
  let remainder = totalCents - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] = (floored[i] ?? 0) + 1;
    remainder -= 1;
  }
  return floored;
}

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEur(cents: Cents): string {
  return eur.format(cents / 100);
}
