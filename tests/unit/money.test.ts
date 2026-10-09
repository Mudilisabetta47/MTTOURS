import { describe, expect, it } from "vitest";
import { allocate, formatEur, percentOf, sumCents, taxFromGross, taxFromNet } from "@/lib/money";

describe("money", () => {
  it("computes VAT contained in gross amounts without float drift", () => {
    expect(taxFromGross(11900, 1900)).toBe(1900);
    expect(taxFromGross(10700, 700)).toBe(700);
    expect(taxFromGross(999, 1900)).toBe(160); // 159.5 → 160 (half away from zero)
    expect(taxFromGross(0, 1900)).toBe(0);
  });

  it("computes VAT on net", () => {
    expect(taxFromNet(10000, 1900)).toBe(1900);
    expect(taxFromNet(105, 1900)).toBe(20); // 19.95 → 20
  });

  it("rejects non-integer cents", () => {
    expect(() => taxFromGross(10.5, 1900)).toThrow(RangeError);
    expect(() => sumCents([1, 2.2])).toThrow(RangeError);
  });

  it("percentages in basis points", () => {
    expect(percentOf(49900, 1000)).toBe(4990);
    expect(percentOf(333, 3333)).toBe(111);
  });

  it("allocates exactly, never losing or creating a cent", () => {
    for (const total of [1, 100, 1001, 99999, 7]) {
      for (const n of [1, 2, 3, 7]) {
        const parts = allocate(total, Array.from({ length: n }, () => 1));
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
      }
    }
    expect(allocate(1000, [1, 2, 2])).toEqual([200, 400, 400]);
  });

  it("formats EUR in German locale", () => {
    expect(formatEur(49900).replace(/\s/g, " ")).toBe("499,00 €");
  });
});
