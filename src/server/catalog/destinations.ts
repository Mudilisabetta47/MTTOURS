import type { Db } from "@/server/db/client";
import type { PoiCategory } from "@/generated/prisma/client";

export type { PoiCategory };

export interface GuidePoi {
  id: string;
  name: string;
  category: PoiCategory;
  description: string | null;
  lat: number;
  lng: number;
  /** great-circle distance from the guide's origin in metres – always labelled "Luftlinie" */
  crowMeters: number;
  isHighlight: boolean;
  highlightText: string | null;
  attribution: string | null;
  photo: { src: string; alt: string; width: number; height: number } | null;
}

export interface Guide {
  slug: string;
  name: string;
  city: string;
  region: string | null;
  intro: string | null;
  center: { lat: number; lng: number; zoom: number };
  /** where distances are measured from; the accommodation only when it is confirmed with coordinates */
  origin: { label: string; lat: number; lng: number; kind: "hotel" | "reference" };
  pois: GuidePoi[];
  attributions: string[];
}

export function crowMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** The published guide for a trip page. Only verified, active places; nothing is invented when there are none. */
export async function getTripGuide(
  db: Db,
  guideId: string | null,
  hotel: { name: string | null; lat: number | null; lng: number | null },
): Promise<Guide | null> {
  if (!guideId) return null;
  const d = await db.destination.findFirst({
    where: { id: guideId, status: "PUBLISHED" },
    include: {
      pois: {
        where: { isActive: true, review: "VERIFIED" },
        orderBy: [{ sort: "asc" }, { name: "asc" }],
        include: { media: { include: { file: { select: { key: true, bucket: true, visibility: true } } } } },
      },
    },
  });
  if (!d) return null;
  const origin =
    hotel.name && hotel.lat !== null && hotel.lng !== null
      ? { label: hotel.name, lat: hotel.lat, lng: hotel.lng, kind: "hotel" as const }
      : { label: d.refLabel, lat: d.refLatitude, lng: d.refLongitude, kind: "reference" as const };
  const showUnconfirmed = process.env.APP_ENV !== "production";
  const pois: GuidePoi[] = d.pois.map((p) => {
    const m = p.media;
    const photoOk = m && m.file.bucket === "public" && m.file.visibility === "PUBLIC" && (m.rightsConfirmed || showUnconfirmed);
    return {
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      lat: p.latitude,
      lng: p.longitude,
      crowMeters: crowMeters(origin, { lat: p.latitude, lng: p.longitude }),
      isHighlight: p.isHighlight,
      highlightText: p.highlightText,
      attribution: p.attribution,
      photo: photoOk ? { src: `/media/${m.file.key}`, alt: m.alt, width: m.width, height: m.height } : null,
    };
  });
  return {
    slug: d.slug,
    name: d.name,
    city: d.city,
    region: d.region,
    intro: d.intro,
    center: { lat: d.latitude, lng: d.longitude, zoom: d.defaultZoom },
    origin,
    pois,
    attributions: [...new Set(pois.map((p) => p.attribution).filter((x): x is string => !!x))],
  };
}
