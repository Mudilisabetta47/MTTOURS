/**
 * Repeatable, read-only import of the public legacy catalogue (Lovable/Supabase) into the new database.
 *
 *   npx tsx scripts/migrate/import-legacy-catalog.ts            # dev/test databases only
 *   npx tsx scripts/migrate/import-legacy-catalog.ts --dry-run  # report only
 *
 * - Reads only public REST endpoints with the public anon key (LEGACY_SUPABASE_URL / LEGACY_SUPABASE_ANON_KEY).
 * - Never writes to the legacy system.
 * - Upserts by slug / departure code and records every legacy id in LegacyIdMap.
 * - Past departures become COMPLETED/CANCELLED; 0 € fares are not imported; nothing is put on sale automatically.
 */
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { CURATED, type CuratedTrip } from "./catalog-curation.ts";
import { DEPARTURE_POINTS } from "../../src/content/places.ts";
import { tzOffsetMinutes } from "../../src/lib/time.ts";

try {
  process.loadEnvFile();
} catch {
  // env from outside
}

const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, "allow-any-db": { type: "boolean", default: false } } });
const DRY = args["dry-run"];
const SOURCE = "supabase:wberoibxqpffhnyvjnci";
const RUN = `catalog-${new Date().toISOString()}`;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL missing");
const dbName = new URL(dbUrl).pathname.slice(1);
if (!/_(dev|test)$/.test(dbName) && !args["allow-any-db"]) {
  throw new Error(`Refusing to import into "${dbName}". Use --allow-any-db only for a reviewed staging run.`);
}

const LEGACY = process.env.LEGACY_SUPABASE_URL;
const KEY = process.env.LEGACY_SUPABASE_ANON_KEY;
if (!LEGACY || !KEY) throw new Error("LEGACY_SUPABASE_URL / LEGACY_SUPABASE_ANON_KEY missing");

type Row = Record<string, unknown>;
async function fetchTable(table: string): Promise<Row[]> {
  const res = await fetch(`${LEGACY}/rest/v1/${table}?select=*`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return (await res.json()) as Row[];
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
const cents = (v: unknown) => Math.round(num(v) * 100);

/** "HAMBURG ZOB " / "Hamburg" → departure point from content/places.ts */
function matchPoint(city: string) {
  const c = city.trim().toLowerCase();
  return DEPARTURE_POINTS.find((d) => c.startsWith(d.name.toLowerCase()));
}

/** local date (YYYY-MM-DD) + "HH:MM" in Europe/Berlin → UTC Date */
function berlin(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(guess.getTime() - tzOffsetMinutes(guess) * 60000);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

async function mapId(legacyTable: string, legacyId: string, entityType: string, entityId: string) {
  await db.legacyIdMap.upsert({
    where: { source_legacyTable_legacyId: { source: SOURCE, legacyTable, legacyId } },
    create: { source: SOURCE, legacyTable, legacyId, entityType, entityId, runId: RUN },
    update: { entityType, entityId, runId: RUN },
  });
}

async function ensureStops() {
  const ids = new Map<string, string>();
  for (const p of DEPARTURE_POINTS) {
    const [street, rest] = p.address.split(", ");
    const [postalCode, ...cityParts] = (rest ?? "").split(" ");
    const stop = await db.stop.upsert({
      where: { name_city: { name: p.stop, city: p.name } },
      create: { name: p.stop, city: p.name, street: street ?? null, postalCode: postalCode ?? null, latitude: p.lat, longitude: p.lng },
      update: { street: street ?? null, postalCode: postalCode ?? null, latitude: p.lat, longitude: p.lng },
    });
    ids.set(p.slug, stop.id);
    void cityParts;
  }
  return ids;
}

interface Pickup {
  pointSlug: string;
  localTime: string | null;
  platform: string | null;
  surchargeCents: number;
  sort: number;
}

async function main() {
  const [tours, dates, tariffs, pickups, routes, extras, weekend] = await Promise.all(
    ["package_tours", "tour_dates", "tour_tariffs", "tour_pickup_stops", "tour_routes", "tour_extras", "weekend_trips"].map(fetchTable),
  ) as [Row[], Row[], Row[], Row[], Row[], Row[], Row[]];
  const report: string[] = [];
  const stopIds = DRY ? new Map<string, string>() : await ensureStops();

  for (const c of CURATED) {
    const legacy = (c.source === "package_tours" ? tours : weekend).find((t) => t.slug === c.legacySlug);
    if (!legacy) {
      report.push(`! ${c.slug}: legacy ${c.source}/${c.legacySlug} not found – skipped`);
      continue;
    }
    const legacyId = str(legacy.id);

    // pickups
    let pk: Pickup[] = [];
    if (c.source === "package_tours") {
      const routeIds = new Set(routes.filter((r) => r.tour_id === legacyId).map((r) => str(r.id)));
      pk = pickups
        .filter((p) => routeIds.has(str(p.route_id)) && p.is_active !== false)
        .flatMap((p): Pickup[] => {
          const point = matchPoint(str(p.city));
          if (!point) return [];
          return [{ pointSlug: point.slug, localTime: str(p.departure_time).slice(0, 5) || null, platform: str(p.meeting_point).trim() || null, surchargeCents: cents(p.surcharge), sort: 0 }];
        });
    } else {
      const first = matchPoint(str(legacy.departure_city));
      if (first) pk.push({ pointSlug: first.slug, localTime: str(legacy.departure_time).slice(0, 5) || null, platform: null, surchargeCents: 0, sort: 0 });
      for (const v of (legacy.via_stops as Row[] | null) ?? []) {
        const point = matchPoint(str(v.city));
        if (point) pk.push({ pointSlug: point.slug, localTime: str(v.departure_time).slice(0, 5) || null, platform: null, surchargeCents: cents(v.surcharge), sort: 0 });
      }
    }
    // order by departure time (earliest first), dedupe by point
    const seen = new Set<string>();
    pk = pk
      .sort((a, b) => (a.localTime ?? "99").localeCompare(b.localTime ?? "99"))
      .filter((p) => (seen.has(p.pointSlug) ? false : (seen.add(p.pointSlug), true)))
      .map((p, i) => ({ ...p, sort: i }));

    const tripDates = c.source === "package_tours" ? dates.filter((d) => d.tour_id === legacyId) : [];
    const tripTariffs = tariffs.filter((t) => t.tour_id === legacyId && t.is_active !== false);
    report.push(`${c.slug} [${c.status}] pickups=${pk.length} dates=${tripDates.length} tariffs=${tripTariffs.length}`);
    if (DRY) continue;

    const trip = await db.trip.upsert({
      where: { slug: c.slug },
      create: tripData(c),
      update: tripData(c),
    });
    await mapId(c.source, legacyId, "Trip", trip.id);

    await db.tripInclusion.deleteMany({ where: { tripId: trip.id } });
    await db.tripInclusion.createMany({
      data: [
        ...c.included.map((text, i) => ({ tripId: trip.id, kind: "INCLUDED" as const, text, sort: i })),
        ...c.excluded.map((text, i) => ({ tripId: trip.id, kind: "EXCLUDED" as const, text, sort: i })),
      ],
    });

    await db.tripPickup.deleteMany({ where: { tripId: trip.id } });
    for (const p of pk) {
      await db.tripPickup.create({
        data: { tripId: trip.id, stopId: stopIds.get(p.pointSlug)!, localTime: p.localTime, platform: p.platform, surchargeCents: p.surchargeCents, sort: p.sort },
      });
    }

    for (const name of c.optionalServices ?? []) {
      const ex = extras.find((e) => e.tour_id === legacyId && str(e.name) === name);
      if (!ex || cents(ex.price) <= 0) continue;
      const existing = await db.optionalService.findFirst({ where: { tripId: trip.id, name } });
      const data = {
        tripId: trip.id,
        name,
        description: str(ex.description) || null,
        priceCents: cents(ex.price),
        unit: str(ex.price_type) === "per_booking" ? ("PER_BOOKING" as const) : ("PER_PERSON" as const),
        maxPerBooking: num(ex.max_per_booking) || null,
      };
      const svc = existing ? await db.optionalService.update({ where: { id: existing.id }, data }) : await db.optionalService.create({ data });
      await mapId("tour_extras", str(ex.id), "OptionalService", svc.id);
    }

    // departures (history + any future ones, never automatically on sale)
    const now = new Date();
    for (const d of tripDates) {
      const date = str(d.departure_date);
      const code = `${c.slug.toUpperCase()}-${date}`;
      const departAt = berlin(date, pk[0]?.localTime ?? "08:00");
      const past = departAt < now;
      const legacyStatus = str(d.status);
      const status = legacyStatus === "cancelled" ? "CANCELLED" : past ? "COMPLETED" : "DRAFT";
      const capacity = Math.max(0, num(d.total_seats));
      const sold = Math.min(capacity, Math.max(0, num(d.booked_seats)));
      // Find by legacy id first, so a changed code never creates a duplicate departure.
      const mapped = await db.legacyIdMap.findUnique({
        where: { source_legacyTable_legacyId: { source: SOURCE, legacyTable: "tour_dates", legacyId: str(d.id) } },
      });
      const dep = await db.tripDeparture.upsert({
        where: mapped ? { id: mapped.entityId } : { code },
        create: {
          tripId: trip.id,
          code,
          departAt,
          returnAt: d.return_date ? berlin(str(d.return_date), "20:00") : null,
          status,
          capacity,
          soldCount: sold,
        },
        update: { code, departAt, status, capacity, soldCount: sold },
      });
      await mapId("tour_dates", str(d.id), "TripDeparture", dep.id);

      for (const t of tripTariffs) {
        const slug = str(t.slug);
        const price = cents(d[`price_${slug}`]);
        if (price <= 0) continue; // 0 € is never a sellable fare
        const conditions = {
          handLuggageOnly: t.hand_luggage_only === true,
          suitcaseKg: t.suitcase_included ? num(t.suitcase_weight_kg) || null : null,
          seatReservation: t.seat_reservation === true,
          refundable: t.is_refundable === true,
          cancellationDays: t.cancellation_days ?? null,
          cancellationFeePercent: t.cancellation_fee_percent ?? null,
          features: (t.included_features as string[] | null) ?? [],
          recommended: t.is_recommended === true,
          legacy: true,
        };
        await db.departureFare.upsert({
          where: { departureId_code: { departureId: dep.id, code: slug.toUpperCase() } },
          create: { departureId: dep.id, code: slug.toUpperCase(), name: str(t.name), priceCents: price, conditions, sort: num(t.sort_order) },
          update: { name: str(t.name), priceCents: price, conditions, sort: num(t.sort_order) },
        });
      }

      await db.departureStop.deleteMany({ where: { departureId: dep.id } });
      for (const p of pk) {
        await db.departureStop.create({
          data: {
            departureId: dep.id,
            stopId: stopIds.get(p.pointSlug)!,
            sequence: p.sort + 1,
            plannedAt: berlin(date, p.localTime ?? pk[0]?.localTime ?? "08:00"),
            platform: p.platform,
            surchargeCents: p.surchargeCents,
          },
        });
      }
    }

    if (c.legacySlug !== c.slug && c.source === "package_tours") {
      await db.redirect.upsert({
        where: { fromPath: `/reisen/${c.legacySlug}` },
        create: { fromPath: `/reisen/${c.legacySlug}`, toPath: `/reisen/${c.slug}`, note: "Import Altsystem" },
        update: { toPath: `/reisen/${c.slug}` },
      });
    }
  }

  if (!DRY) {
    await db.auditLog.create({ data: { actorLabel: "migration", action: "catalog.import", entityType: "Catalog", entityId: RUN, after: { report } } });
  }
  console.log(`${DRY ? "[dry-run] " : ""}${RUN}\n` + report.join("\n"));
}

function tripData(c: CuratedTrip) {
  return {
    slug: c.slug,
    title: c.title,
    productType: c.productType,
    status: c.status,
    countryCode: c.countryCode,
    destination: c.destination,
    summary: c.summary,
    description: c.description,
    durationDays: c.durationDays,
    category: c.category,
    motif: c.motif,
    highlights: c.highlights,
    reviewNotes: c.reviewNotes,
    hotelName: c.hotelName ?? null,
    hotelAddress: c.hotelAddress ?? null,
    seoTitle: c.seoTitle,
    seoDescription: c.seoDescription,
    publishedAt: c.status === "PUBLISHED" ? new Date() : null,
  };
}

try {
  await main();
} finally {
  await db.$disconnect();
}
