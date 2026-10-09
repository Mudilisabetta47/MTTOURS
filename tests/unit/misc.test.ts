import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-redirect";
import { businessDayRange } from "@/lib/time";
import { formatNumber } from "@/server/numbering";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/server/auth/password";

describe("safeNextPath", () => {
  it("allows relative paths only", () => {
    expect(safeNextPath("/admin/buchungen")).toBe("/admin/buchungen");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(undefined, "/admin")).toBe("/admin");
  });
});

describe("businessDayRange (Europe/Berlin)", () => {
  it("summer day = 22:00Z to 22:00Z", () => {
    const r = businessDayRange(new Date("2026-07-10T10:00:00Z"));
    expect(r.start.toISOString()).toBe("2026-07-09T22:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-07-10T22:00:00.000Z");
  });
  it("DST end day has 25 hours", () => {
    const r = businessDayRange(new Date("2026-10-25T12:00:00Z"));
    expect(r.start.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
  it("tomorrow offset", () => {
    const r = businessDayRange(new Date("2026-12-31T22:30:00Z"), 1); // 23:30 on 31 Dec in Berlin → tomorrow = 1 Jan
    expect(r.start.toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(r.end.toISOString()).toBe("2027-01-01T23:00:00.000Z");
  });
});

describe("numbering format", () => {
  it("pads per scope", () => {
    expect(formatNumber("INVOICE", 2026, 7)).toBe("RE-2026-00007");
    expect(formatNumber("TICKET", 2026, 42)).toBe("TKT-2026-000042");
  });
});

describe("password hashing (argon2id)", () => {
  it("hashes with argon2id and verifies", async () => {
    const h = await hashPassword("ein langes sicheres Passwort");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "ein langes sicheres Passwort")).toBe(true);
    expect(await verifyPassword(h, "falsch")).toBe(false);
    expect(await verifyPassword(null, "egal")).toBe(false);
  });
  it("rejects weak passwords", () => {
    expect(validatePasswordStrength("kurz")).not.toBeNull();
    expect(validatePasswordStrength("aaaaaaaaaaaaaaa")).not.toBeNull();
    expect(validatePasswordStrength("Bus nach Novalja 2027!")).toBeNull();
  });
});
