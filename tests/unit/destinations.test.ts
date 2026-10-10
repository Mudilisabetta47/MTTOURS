import { describe, expect, it } from "vitest";
import { crowMeters } from "@/server/catalog/destinations";
import { formatDistance, formatDuration } from "@/components/destination/categories";

describe("destination distances", () => {
  it("computes great-circle distances (one degree of latitude ≈ 111.2 km)", () => {
    expect(crowMeters({ lat: 50, lng: 10 }, { lat: 51, lng: 10 })).toBe(111_195);
    // along a parallel the distance shrinks with cos(latitude)
    expect(crowMeters({ lat: 60, lng: 10 }, { lat: 60, lng: 11 })).toBe(55_597);
    expect(crowMeters({ lat: 50, lng: 10 }, { lat: 50, lng: 10 })).toBe(0);
  });

  it("formats without false precision", () => {
    expect(formatDistance(12)).toBe("50 m");
    expect(formatDistance(437)).toBe("450 m");
    expect(formatDistance(999)).toBe("1,0 km");
    expect(formatDistance(1530)).toBe("1,5 km");
    expect(formatDistance(23_960)).toBe("24 km");
  });

  it("formats routing durations", () => {
    expect(formatDuration(960)).toBe("16 Min.");
    expect(formatDuration(3600)).toBe("1 Std.");
    expect(formatDuration(5400)).toBe("1 Std. 30 Min.");
  });
});
