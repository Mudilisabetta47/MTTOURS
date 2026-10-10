/**
 * Read-only import of the trip photos the old site stored in its own Supabase storage bucket.
 *
 *   npx tsx scripts/migrate/import-legacy-trip-media.ts            # dev/test databases only
 *   npx tsx scripts/migrate/import-legacy-trip-media.ts --dry-run  # report only
 *
 * - Only files on the legacy project's own storage host are taken. Hotlinks to third-party sites
 *   (holiday portals, travel blogs) are reported and skipped.
 * - Every imported image is stored with rightsConfirmed = false. The public site shows unconfirmed
 *   images only outside production; the office must confirm the rights before go-live.
 * - Files land in storage/public/ (git-ignored) as WebP; StoredFile/MediaAsset/TripMedia are upserted.
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";
import { MEDIA_NOTES } from "./media-curation.ts";

try {
  process.loadEnvFile();
} catch {
  // env from outside
}

const { values: args } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, "allow-any-db": { type: "boolean", default: false } } });
const DRY = args["dry-run"];
const SOURCE = "supabase:wberoibxqpffhnyvjnci";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL missing");
const dbName = new URL(dbUrl).pathname.slice(1);
if (!/_(dev|test)$/.test(dbName) && !args["allow-any-db"]) {
  throw new Error(`Refusing to import into "${dbName}". Use --allow-any-db only for a reviewed staging run.`);
}
const LEGACY = process.env.LEGACY_SUPABASE_URL;
const KEY = process.env.LEGACY_SUPABASE_ANON_KEY;
if (!LEGACY || !KEY) throw new Error("LEGACY_SUPABASE_URL / LEGACY_SUPABASE_ANON_KEY missing");
const ownHost = new URL(LEGACY).host;

const STORAGE_ROOT = join(process.cwd(), "storage", "public");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: dbUrl }) });

type Row = Record<string, unknown>;
async function fetchTable(table: string): Promise<Row[]> {
  const res = await fetch(`${LEGACY}/rest/v1/${table}?select=*`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` } });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return (await res.json()) as Row[];
}

const urls = (r: Row): { url: string; role: "HERO" | "GALLERY" }[] => {
  const out: { url: string; role: "HERO" | "GALLERY" }[] = [];
  const push = (v: unknown, role: "HERO" | "GALLERY") => {
    if (typeof v === "string" && v && !out.some((o) => o.url === v)) out.push({ url: v, role });
  };
  push(r.hero_image_url, "HERO");
  push(r.image_url, out.length ? "GALLERY" : "HERO");
  for (const g of Array.isArray(r.gallery_images) ? r.gallery_images : []) push(g, "GALLERY");
  return out;
};

const report = { imported: 0, unchanged: 0, skippedForeign: [] as string[], failed: [] as string[] };

async function importTrip(legacyTable: string, row: Row) {
  const map = await db.legacyIdMap.findFirst({ where: { source: SOURCE, legacyTable, legacyId: String(row.id), entityType: "Trip" } });
  if (!map) return;
  const trip = await db.trip.findUnique({ where: { id: map.entityId }, select: { id: true, slug: true, title: true, destination: true } });
  if (!trip) return;

  let sort = 0;
  const seen = new Set<string>();
  const linked: string[] = [];
  // an editorial hero choice wins over the order of the old site
  const list = urls(row).sort((a, b) => Number(!!MEDIA_NOTES[b.url.split("/").pop()!]?.hero) - Number(!!MEDIA_NOTES[a.url.split("/").pop()!]?.hero));
  for (const { url, role: wanted } of list) {
    const u = new URL(url);
    if (u.host !== ownHost || !u.pathname.includes("/storage/v1/object/public/")) {
      report.skippedForeign.push(`${trip.slug}: ${u.host}`);
      continue;
    }
    const file = u.pathname.split("/").pop()!;
    const note = MEDIA_NOTES[file];
    if (note?.exclude) {
      report.skippedForeign.push(`${trip.slug}: ${file} (${note.exclude})`);
      continue;
    }
    if (DRY) {
      console.log(`[dry] ${trip.slug} ${wanted} ${file}`);
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) {
      report.failed.push(`${trip.slug}: ${file} HTTP ${res.status}`);
      continue;
    }
    const original = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(original).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
    const sha = createHash("sha256").update(webp.data).digest("hex");
    // the old site often stored the same picture as hero and preview
    if (seen.has(sha)) continue;
    seen.add(sha);
    const role = seen.size === 1 ? "HERO" : wanted === "HERO" ? "GALLERY" : wanted;
    const key = `trips/${trip.slug}/${sha.slice(0, 16)}.webp`;
    const path = join(STORAGE_ROOT, key);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, webp.data);

    const existing = await db.storedFile.findUnique({ where: { bucket_key: { bucket: "public", key } }, include: { media: true } });
    const stored =
      existing ??
      (await db.storedFile.create({
        data: { bucket: "public", key, mimeType: "image/webp", sizeBytes: webp.info.size, sha256: sha, visibility: "PUBLIC", ownerType: "trip", ownerId: trip.id },
      }));
    const alt = note?.alt ?? `${trip.destination} – Reiseimpression`;
    const media =
      existing?.media ??
      (await db.mediaAsset.create({
        data: {
          fileId: stored.id,
          alt,
          width: webp.info.width,
          height: webp.info.height,
          credit: `Altsystem metours.de (${file}) – Herkunft und Nutzungsrechte ungeklärt`,
          isAiGenerated: false,
          rightsConfirmed: false,
        },
      }));
    if (existing?.media && note?.alt && existing.media.alt !== note.alt) await db.mediaAsset.update({ where: { id: media.id }, data: { alt: note.alt } });
    await db.tripMedia.upsert({
      where: { tripId_mediaId: { tripId: trip.id, mediaId: media.id } },
      create: { tripId: trip.id, mediaId: media.id, role, sort },
      update: { role, sort },
    });
    await db.legacyIdMap.upsert({
      where: { source_legacyTable_legacyId: { source: SOURCE, legacyTable: "storage:tour-images", legacyId: u.pathname } },
      create: { source: SOURCE, legacyTable: "storage:tour-images", legacyId: u.pathname, entityType: "MediaAsset", entityId: media.id, runId: `media-${new Date().toISOString()}` },
      update: { entityId: media.id },
    });
    linked.push(media.id);
    if (existing) report.unchanged++;
    else report.imported++;
    sort++;
  }
  if (DRY) return;
  // pictures excluded since an earlier run are unlinked again (the files stay for the audit trail)
  const removed = await db.tripMedia.deleteMany({ where: { tripId: trip.id, mediaId: { notIn: linked }, media: { credit: { startsWith: "Altsystem" } } } });
  if (removed.count) console.log(`${trip.slug}: ${removed.count} Bild(er) entfernt`);
}

try {
  for (const table of ["package_tours", "weekend_trips"]) {
    for (const row of await fetchTable(table)) await importTrip(table, row);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await db.$disconnect();
}
