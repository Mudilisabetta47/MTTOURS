import type { Tx } from "@/server/db/client";

export type NumberScope =
  | "ORDER"
  | "BOOKING"
  | "TICKET"
  | "INQUIRY"
  | "QUOTE"
  | "CHARTER"
  | "RUN"
  | "INVOICE"
  | "CREDIT_NOTE";

const PREFIX: Record<NumberScope, string> = {
  ORDER: "MT-O",
  BOOKING: "MT",
  TICKET: "TKT",
  INQUIRY: "ANF",
  QUOTE: "ANG",
  CHARTER: "AUF",
  RUN: "F",
  INVOICE: "RE",
  CREDIT_NOTE: "GS",
};

const WIDTH: Record<NumberScope, number> = {
  ORDER: 6,
  BOOKING: 6,
  TICKET: 6,
  INQUIRY: 5,
  QUOTE: 5,
  CHARTER: 5,
  RUN: 5,
  INVOICE: 5,
  CREDIT_NOTE: 5,
};

/**
 * Next number for a scope/year. Must run inside the business transaction:
 * the row lock serialises concurrent callers and a rollback also rolls back the counter,
 * so committed numbers are gapless and unique (required for invoices).
 */
export async function nextNumber(tx: Tx, scope: NumberScope, year: number): Promise<string> {
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "NumberSequence" ("scope", "year", "nextValue")
    VALUES (${scope}, ${year}, 2)
    ON CONFLICT ("scope", "year") DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1
    RETURNING "nextValue" - 1 AS value`;
  const value = rows[0]?.value;
  if (value === undefined) throw new Error("Number sequence did not return a value");
  return formatNumber(scope, year, Number(value));
}

export function formatNumber(scope: NumberScope, year: number, value: number): string {
  return `${PREFIX[scope]}-${year}-${String(value).padStart(WIDTH[scope], "0")}`;
}
