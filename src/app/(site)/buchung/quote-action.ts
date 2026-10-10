"use server";

import { db } from "@/server/db/client";
import { resolveSelection, SelectionError, SelectionInput, type SelectionErrorCode } from "@/server/booking/selection";

export interface QuoteLine {
  kind: "FARE" | "STOP_SURCHARGE" | "OPTIONAL_SERVICE";
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export type QuoteResult =
  | { ok: true; key: string; lines: QuoteLine[]; totalCents: number; seatsLeft: number }
  | { ok: false; key: string; error: string; code: SelectionErrorCode };

/**
 * Live price for the booking card. Read-only: validates the selection against the database and prices it
 * with the same code the checkout uses. The browser only ever displays what this returns.
 */
export async function quoteAction(raw: unknown): Promise<QuoteResult> {
  const parsed = SelectionInput.safeParse(raw);
  const key = typeof raw === "object" && raw && "key" in raw ? String((raw as { key: unknown }).key).slice(0, 200) : "";
  if (!parsed.success) return { ok: false, key, error: "Bitte Ihre Auswahl prüfen.", code: "invalid" };
  try {
    const r = await resolveSelection(db, parsed.data);
    return {
      ok: true,
      key,
      lines: r.price.lines.map((l) => ({ kind: l.kind, description: l.description, quantity: l.quantity, unitPriceCents: l.unitPriceCents, totalCents: l.totalCents })),
      totalCents: r.price.totalCents,
      seatsLeft: r.seatsLeft,
    };
  } catch (e) {
    if (e instanceof SelectionError) return { ok: false, key, error: e.message, code: e.code };
    throw e;
  }
}
