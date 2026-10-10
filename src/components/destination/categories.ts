import type { PoiCategory } from "@/generated/prisma/enums";

export const CATEGORY_ORDER: PoiCategory[] = ["SIGHT", "BEACH_NATURE", "FOOD", "LEISURE", "TRANSPORT", "AIRPORT"];

/** Labels, section headings and 24×24 stroke icons per category (one green accent, no rainbow). */
export const CATEGORY: Record<PoiCategory, { label: string; one: string; heading: (city: string) => string; icon: string }> = {
  SIGHT: {
    label: "Sehenswürdigkeiten",
    one: "Sehenswürdigkeit",
    heading: (c) => `Sehenswürdigkeiten in ${c}`,
    icon: "M4 20h16M6 20V10M10 20V10M14 20V10M18 20V10M3 10h18L12 4 3 10Z",
  },
  BEACH_NATURE: {
    label: "Strände & Natur",
    one: "Strand & Natur",
    heading: () => "Strände und Natur",
    icon: "M3 20c2 0 2-1.5 4.5-1.5S9.5 20 12 20s2.5-1.5 4.5-1.5S19 20 21 20M12 16V8m0 0c-2.5-3-6-3-7.5-1.5M12 8c2.5-3 6-3 7.5-1.5M12 8c-1-2.5-.5-4.5 1-5.5",
  },
  FOOD: {
    label: "Restaurants & Cafés",
    one: "Restaurant & Café",
    heading: () => "Restaurants und Cafés",
    icon: "M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17",
  },
  LEISURE: {
    label: "Shopping & Freizeit",
    one: "Shopping & Freizeit",
    heading: () => "Shopping und Freizeit",
    icon: "M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2",
  },
  TRANSPORT: {
    label: "Öffentlicher Verkehr",
    one: "Verkehr",
    heading: () => "Anreise und Mobilität",
    icon: "M7 17V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v11H7Zm0-5h10M9 20l-1.5 1.5M15 20l1.5 1.5M9.5 14.5h.01M14.5 14.5h.01",
  },
  AIRPORT: {
    label: "Flughäfen",
    one: "Flughafen",
    heading: () => "Flughäfen in der Nähe",
    icon: "M10.5 13.5 4 12l-1 1.5 6 3 3 6 1.5-1-1.5-6.5L17 10c1.5-1.5 2.5-3.5 2-4.5-1-.5-3 .5-4.5 2l-4 5Z",
  },
};

/** "350 m" / "1,2 km" / "24 km" – rounding never pretends more precision than a straight line has. */
export function formatDistance(m: number): string {
  const near = Math.max(50, Math.round(m / 50) * 50);
  if (near < 1000) return `${near} m`;
  if (m < 10_000) return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
  return `${Math.round(m / 1000)} km`;
}

export function formatDuration(s: number): string {
  const min = Math.round(s / 60);
  if (min < 60) return `${min} Min.`;
  return `${Math.floor(min / 60)} Std. ${min % 60 ? `${min % 60} Min.` : ""}`.trim();
}
