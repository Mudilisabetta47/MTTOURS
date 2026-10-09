import type { Tx } from "@/server/db/client";

export class SoldOutError extends Error {
  constructor(readonly departureId: string, readonly requested: number) {
    super("Nicht genügend freie Plätze");
  }
}

/**
 * Atomically reserve `quantity` places on a departure. A single conditional UPDATE:
 * concurrent callers cannot both succeed beyond capacity (row lock + CHECK constraint).
 */
export async function reserveCapacity(tx: Tx, departureId: string, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError("quantity must be a positive integer");
  const updated = await tx.$executeRaw`
    UPDATE "TripDeparture"
       SET "heldCount" = "heldCount" + ${quantity}, "updatedAt" = now()
     WHERE "id" = ${departureId}
       AND "status" = 'ON_SALE'
       AND ("bookingDeadline" IS NULL OR "bookingDeadline" > now())
       AND "soldCount" + "heldCount" + ${quantity} <= "capacity"`;
  if (updated !== 1) throw new SoldOutError(departureId, quantity);
}

/** Turn held places into sold places (after confirmed payment). */
export async function convertHeldToSold(tx: Tx, departureId: string, quantity: number): Promise<void> {
  const updated = await tx.$executeRaw`
    UPDATE "TripDeparture"
       SET "heldCount" = "heldCount" - ${quantity}, "soldCount" = "soldCount" + ${quantity}, "updatedAt" = now()
     WHERE "id" = ${departureId} AND "heldCount" >= ${quantity}`;
  if (updated !== 1) throw new Error("Held capacity missing for conversion");
}

/** Release held places (abandoned or expired checkout). */
export async function releaseHeld(tx: Tx, departureId: string, quantity: number): Promise<void> {
  await tx.$executeRaw`
    UPDATE "TripDeparture"
       SET "heldCount" = GREATEST("heldCount" - ${quantity}, 0), "updatedAt" = now()
     WHERE "id" = ${departureId}`;
}
