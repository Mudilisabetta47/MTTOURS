/**
 * Places used on the public site. Departure points and addresses come from the pickup stops of the
 * existing booking system (tour_pickup_stops, read 09.10.2026). Destinations are the destinations of the
 * existing programme (package_tours / weekend_trips). They are editorial content without prices or dates —
 * bookable trips always come from the database (Trip/TripDeparture). Moves to the CMS in phase 8.
 */

export interface Place {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export interface DeparturePoint extends Place {
  stop: string;
  address: string;
}

export const DEPARTURE_POINTS: DeparturePoint[] = [
  { slug: "hamburg", name: "Hamburg", country: "Deutschland", stop: "Hamburg ZOB", address: "Adenauerallee 78, 20097 Hamburg", lat: 53.5523, lng: 10.0115 },
  { slug: "bremen", name: "Bremen", country: "Deutschland", stop: "Bremen ZOB", address: "Rosa-Parks-Ring 11–15, 28195 Bremen", lat: 53.0838, lng: 8.8136 },
  { slug: "hannover", name: "Hannover", country: "Deutschland", stop: "Hannover ZOB", address: "Rundestraße 12, 30161 Hannover", lat: 52.3795, lng: 9.7364 },
];

export interface Destination extends Place {
  /** how it appeared in the existing programme */
  format: "Pauschalreise" | "Wochenendtrip";
  tone: [string, string];
}

export const DESTINATIONS: Destination[] = [
  { slug: "nizza", name: "Nizza", country: "Frankreich", format: "Pauschalreise", lat: 43.7034, lng: 7.2663, tone: ["#f4b57f", "#2f6fae"] },
  { slug: "lloret-de-mar", name: "Lloret de Mar", country: "Spanien", format: "Pauschalreise", lat: 41.6995, lng: 2.8456, tone: ["#ffd08a", "#1f7fb6"] },
  { slug: "sanremo", name: "Sanremo", country: "Italien", format: "Pauschalreise", lat: 43.8159, lng: 7.7761, tone: ["#f7c59f", "#3b7fa8"] },
  { slug: "novalja", name: "Novalja", country: "Kroatien", format: "Pauschalreise", lat: 44.5544, lng: 14.8856, tone: ["#d9f0ff", "#0f6c8f"] },
  { slug: "paris", name: "Paris", country: "Frankreich", format: "Wochenendtrip", lat: 48.8566, lng: 2.3522, tone: ["#c9b8d9", "#2b2f55"] },
  { slug: "prag", name: "Prag", country: "Tschechien", format: "Wochenendtrip", lat: 50.0755, lng: 14.4378, tone: ["#e9c9a0", "#4a2f3a"] },
  { slug: "amsterdam", name: "Amsterdam", country: "Niederlande", format: "Wochenendtrip", lat: 52.3676, lng: 4.9041, tone: ["#ffd9a8", "#20425e"] },
  { slug: "kopenhagen", name: "Kopenhagen", country: "Dänemark", format: "Wochenendtrip", lat: 55.6761, lng: 12.5683, tone: ["#f4e0b8", "#25506b"] },
];

/** Great-circle distance in km (straight line, not road distance). */
export function distanceKm(a: Pick<Place, "lat" | "lng">, b: Pick<Place, "lat" | "lng">): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function formatCoord(lat: number, lng: number): string {
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, "N", "S")} · ${f(lng, "O", "W")}`;
}
