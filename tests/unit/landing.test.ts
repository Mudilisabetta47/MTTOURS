import { describe, expect, it } from "vitest";
import { landingPages, landingSlugs } from "@/content/landing";
import { UNCONFIRMED_CLAIMS } from "@/content/landing/sanitize";

describe("legacy landing pages", () => {
  it("keeps all legacy URLs except /bus-mieten (own page)", () => {
    expect(landingSlugs).toHaveLength(18);
    expect(landingSlugs).toContain("bus-mieten-hannover");
    expect(landingSlugs).not.toContain("bus-mieten");
  });

  it("render no unconfirmed operational claims", () => {
    for (const p of landingPages) {
      const text = JSON.stringify({ ...p, fleet: [], links: [] });
      for (const c of UNCONFIRMED_CLAIMS) {
        expect(c.rule.test(text), `${p.slug}: ${c.why} → ${text.match(c.rule)?.[0]}`).toBe(false);
      }
    }
  });

  it("every page still has substance after cleaning", () => {
    for (const p of landingPages) {
      expect(p.sections.length + p.why.length, p.slug).toBeGreaterThan(1);
      expect(p.seoDescription.length, p.slug).toBeGreaterThan(50);
    }
  });
});
