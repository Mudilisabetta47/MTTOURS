/**
 * Creates the destination guides from destination-curation.ts. Each place is matched in OpenStreetMap
 * (Nominatim, max. 1 request/s, cached) and only stored when a match lies near the destination.
 *
 *   npx tsx scripts/migrate/seed-destinations.ts            # dev/test databases only
 *   npx tsx scripts/migrate/seed-destinations.ts --dry-run
 *
 * Places edited in the admin (verifiedBy ≠ script) are never overwritten.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { DESTINATIONS } from "./destination-curation.ts";

try {
  process.loadEnvFile();
} catch {
  // env from outside
}
const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, "allow-any-db": { type: "boolean", default: false } } });
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL missing");
const dbName = new URL(dbUrl).pathname.slice(1);
if (!/_(dev|test)$/.test(dbName) && !args["allow-any-db"]) throw new Error(`Refusing to write to "${dbName}".`);

const SCRIPT = "Abgleich OpenStreetMap (Skript)";
const ATTRIBUTION = "© OpenStreetMap-Mitwirkende (ODbL)";
const CACHE = "storage/cache/nominatim.json";
const UA = "MetropolTours-Destinations/1.0 (kundenservice@metours.de)";

type Geo = { type: string; coordinates: unknown };
type Hit = { lat: string; lon: string; osm_type: string; osm_id: number; display_name: string; category?: string; type?: string; geojson?: Geo };
const cache: Record<string, Hit[]> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
let last = 0;

async function search(q: string, cc: string, geometry = false): Promise<Hit[]> {
  const key = `${cc}|${q}${geometry ? "|geo" : ""}`;
  if (cache[key]) return cache[key]!;
  const wait = 1100 - (Date.now() - last);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&accept-language=de&countrycodes=${cc.toLowerCase()}&q=${encodeURIComponent(q)}${geometry ? "&polygon_geojson=1&polygon_threshold=0.0002" : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for ${q}`);
  const hits = (await res.json()) as Hit[];
  cache[key] = hits;
  return hits;
}

const km = (a: [number, number], b: [number, number]) => {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** all [lat, lon] vertices of a GeoJSON geometry */
function vertices(g: Geo | undefined): [number, number][] {
  const out: [number, number][] = [];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") out.push([c[1] as number, c[0] as number]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(g?.coordinates);
  return out;
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });
const report: { stored: string[]; unmatched: string[]; kept: string[] } = { stored: [], unmatched: [], kept: [] };

try {
  for (const d of DESTINATIONS) {
    const ref = (await search(d.ref.query, d.countryCode))[0];
    if (!ref) throw new Error(`Reference point not found: ${d.ref.query}`);
    const center: [number, number] = [Number(ref.lat), Number(ref.lon)];
    if (args["dry-run"]) console.log(`[dry] ${d.slug} ref ${center.join(",")} ${ref.display_name}`);
    const dest = args["dry-run"]
      ? null
      : await db.destination.upsert({
          where: { slug: d.slug },
          create: {
            slug: d.slug,
            name: d.name,
            countryCode: d.countryCode,
            region: d.region,
            city: d.city,
            latitude: center[0],
            longitude: center[1],
            refLabel: d.ref.label,
            refLatitude: center[0],
            refLongitude: center[1],
            intro: d.intro,
            defaultZoom: d.zoom,
            status: "PUBLISHED",
          },
          update: {},
        });
    if (dest) await db.trip.updateMany({ where: { slug: { in: d.trips }, guideId: null }, data: { guideId: dest.id } });

    let sort = 0;
    for (const p of d.pois) {
      sort++;
      const hits = await search(p.query ?? `${p.name}, ${d.city}`, d.countryCode, !!p.nearest);
      const found = hits.find((h) => km(center, [Number(h.lat), Number(h.lon)]) <= (p.radiusKm ?? 10) && (!p.expect || p.expect.test(h.display_name)));
      const hit = found && p.nearest ? (() => {
        const best = vertices(found.geojson).sort((a, b) => km(center, a) - km(center, b))[0];
        return best ? { ...found, lat: String(best[0]), lon: String(best[1]) } : found;
      })() : found;
      if (!hit) {
        report.unmatched.push(`${d.slug}: ${p.name}`);
        continue;
      }
      const label = `${d.slug}: ${p.name} → ${hit.osm_type}/${hit.osm_id} (${km(center, [Number(hit.lat), Number(hit.lon)]).toFixed(2)} km)`;
      if (!dest) {
        console.log(`[dry] ${label} ${hit.display_name.slice(0, 80)}`);
        continue;
      }
      const existing = await db.destinationPoi.findUnique({ where: { destinationId_name: { destinationId: dest.id, name: p.name } } });
      if (existing && existing.verifiedBy !== SCRIPT) {
        report.kept.push(`${d.slug}: ${p.name}`);
        continue;
      }
      const data = {
        category: p.category,
        description: p.description ?? null,
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
        address: hit.display_name.split(", ").slice(0, 4).join(", "),
        source: `osm:${hit.osm_type}/${hit.osm_id}`,
        attribution: ATTRIBUTION,
        review: "VERIFIED" as const,
        verifiedAt: new Date(),
        verifiedBy: SCRIPT,
        isHighlight: !!p.highlight,
        highlightText: p.highlight ?? null,
        sort,
      };
      await db.destinationPoi.upsert({ where: { destinationId_name: { destinationId: dest.id, name: p.name } }, create: { destinationId: dest.id, name: p.name, ...data }, update: data });
      report.stored.push(label);
    }
  }
} finally {
  mkdirSync("storage/cache", { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache, null, 1));
  await db.$disconnect();
}
console.log(JSON.stringify(report, null, 2));
