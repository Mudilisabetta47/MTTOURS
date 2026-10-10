import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { addPoiFromOsm, DestinationAdminError, setPoiReview, updatePoi } from "@/server/destinations/admin";
import { getTripGuide } from "@/server/catalog/destinations";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

async function setup() {
  const user = await db.user.create({ data: { email: `ed-${Date.now()}@example.org`, displayName: "Redaktion Test" } });
  const d = await db.destination.create({
    data: { slug: "testdorf", name: "Testdorf", countryCode: "FR", city: "Nice", latitude: 43.7, longitude: 7.27, refLabel: "Testplatz", refLatitude: 43.7, refLongitude: 7.27, status: "PUBLISHED" },
  });
  return { actor: { id: user.id, displayName: user.displayName }, d };
}

const osm = (hits: object[]) => (async () => new Response(JSON.stringify(hits), { status: 200 })) as unknown as typeof fetch;

describe("destination admin", () => {
  it("stores an OSM match near the destination as draft, publishes only after review", async () => {
    const { actor, d } = await setup();
    const { poi } = await addPoiFromOsm(db, actor, d.id, { name: "Testmuseum", category: "SIGHT", radiusKm: 10, query: null, description: null }, osm([{ lat: "43.71", lon: "7.28", osm_type: "way", osm_id: 42, display_name: "Testmuseum, Nizza" }]));
    expect(poi.review).toBe("DRAFT");
    expect(poi.source).toBe("osm:way/42");

    const guide = () => getTripGuide(db, d.id, { name: null, lat: null, lng: null });
    expect((await guide())!.pois).toHaveLength(0);
    await setPoiReview(db, actor, poi.id, "VERIFIED");
    const g = await guide();
    expect(g!.pois.map((p) => p.name)).toEqual(["Testmuseum"]);
    expect(g!.origin).toMatchObject({ label: "Testplatz", kind: "reference" });
    expect(g!.pois[0]!.crowMeters).toBeGreaterThan(1000);
    expect(await db.auditLog.count({ where: { entityId: poi.id } })).toBe(2);
  });

  it("rejects matches outside the radius instead of guessing", async () => {
    const { actor, d } = await setup();
    await expect(
      addPoiFromOsm(db, actor, d.id, { name: "Weit weg", category: "SIGHT", radiusKm: 5, query: null, description: null }, osm([{ lat: "48.85", lon: "2.35", osm_type: "node", osm_id: 1, display_name: "Paris" }])),
    ).rejects.toThrow(DestinationAdminError);
    expect(await db.destinationPoi.count()).toBe(0);
  });

  it("a moved marker becomes an editorial position checked by the editor", async () => {
    const { actor, d } = await setup();
    const p = await db.destinationPoi.create({ data: { destinationId: d.id, name: "Strand", category: "BEACH_NATURE", latitude: 43.69, longitude: 7.26, source: "osm:way/1", attribution: "© OSM", review: "VERIFIED" } });
    await updatePoi(db, actor, p.id, { category: "BEACH_NATURE", description: null, latitude: 43.691, longitude: 7.261, isActive: true, isHighlight: true, highlightText: "Test", sort: 1 });
    const after = await db.destinationPoi.findUniqueOrThrow({ where: { id: p.id } });
    expect(after).toMatchObject({ source: "editorial", attribution: null, verifiedBy: "manuell: Redaktion Test", isHighlight: true });
  });

  it("measures from a confirmed hotel when it has coordinates", async () => {
    const { d } = await setup();
    await db.destinationPoi.create({ data: { destinationId: d.id, name: "Ort", category: "SIGHT", latitude: 43.7, longitude: 7.27, source: "editorial", review: "VERIFIED" } });
    const g = await getTripGuide(db, d.id, { name: "Testhotel", lat: 43.71, lng: 7.27 });
    expect(g!.origin).toMatchObject({ label: "Testhotel", kind: "hotel" });
    expect(g!.pois[0]!.crowMeters).toBe(1112);
  });
});
