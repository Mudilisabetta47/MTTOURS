import { describe, expect, it } from "vitest";
import { quote, PricingError } from "@/server/booking/pricing";

const base = {
  passengers: 2,
  fare: { id: "f1", name: "Smart", priceCents: 54900 },
  boardingStop: { id: "s1", name: "Hamburg ZOB", surchargeCents: 4900 },
  options: [],
};

describe("pricing", () => {
  it("adds fare and boarding surcharge per traveller", () => {
    const q = quote(base);
    expect(q.totalCents).toBe(2 * 54900 + 2 * 4900);
    expect(q.lines.map((l) => l.kind)).toEqual(["FARE", "STOP_SURCHARGE"]);
  });

  it("omits the surcharge line when there is none", () => {
    expect(quote({ ...base, boardingStop: { ...base.boardingStop, surchargeCents: 0 } }).lines).toHaveLength(1);
  });

  it("caps per-person options at the number of travellers; per-booking counts once", () => {
    const q = quote({
      ...base,
      options: [
        { id: "o1", name: "Reiserücktritt", priceCents: 3900, unit: "PER_PERSON", quantity: 5 },
        { id: "o2", name: "Parkplatz", priceCents: 1000, unit: "PER_BOOKING", quantity: 3 },
      ],
    });
    expect(q.lines.find((l) => l.referenceId === "o1")!.totalCents).toBe(2 * 3900);
    expect(q.lines.find((l) => l.referenceId === "o2")!.totalCents).toBe(1000);
    expect(q.totalCents).toBe(2 * 54900 + 2 * 4900 + 2 * 3900 + 1000);
  });

  it("rejects free fares and invalid traveller counts", () => {
    expect(() => quote({ ...base, fare: { ...base.fare, priceCents: 0 } })).toThrow(PricingError);
    expect(() => quote({ ...base, passengers: 0 })).toThrow(PricingError);
    expect(() => quote({ ...base, passengers: 21 })).toThrow(PricingError);
  });
});
