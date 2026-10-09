import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";

// Equirectangular projection around 48° N; only real coordinates, no invented geography.
const BOUNDS = { lngMin: 0.5, lngMax: 17.5, latMin: 40.6, latMax: 57.4 };
const W = 1000;
const K = Math.cos((48 * Math.PI) / 180);
const H = Math.round((W * (BOUNDS.latMax - BOUNDS.latMin)) / ((BOUNDS.lngMax - BOUNDS.lngMin) * K));

const px = (lng: number) => ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * W;
const py = (lat: number) => ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * H;

/** Label placement to avoid collisions between close places (viewBox units). */
const LABEL: Record<string, { dx: number; dy: number; anchor?: "start" | "end" }> = {
  hamburg: { dx: 18, dy: -14 },
  bremen: { dx: -18, dy: -10, anchor: "end" },
  hannover: { dx: 18, dy: 30 },
  kopenhagen: { dx: 16, dy: -12 },
  nizza: { dx: -16, dy: 8, anchor: "end" },
  sanremo: { dx: 16, dy: 22 },
  "lloret-de-mar": { dx: 16, dy: 8 },
};
const lab = (slug: string) => LABEL[slug] ?? { dx: 16, dy: 8 };

/** Stylised route network: Hamburg → Bremen → Hannover feeder, then arcs to the programme destinations. */
export function RouteMap() {
  const hh = DEPARTURE_POINTS.find((d) => d.slug === "hamburg")!;
  const hb = DEPARTURE_POINTS.find((d) => d.slug === "bremen")!;
  const ha = DEPARTURE_POINTS.find((d) => d.slug === "hannover")!;
  const ox = px(ha.lng);
  const oy = py(ha.lat);

  return (
    <svg className="route__map" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="route-svg-title">
      <title id="route-svg-title">
        Stilisierte Karte: Zustiege in Hamburg, Bremen und Hannover und Ziele aus dem Programm von Nizza bis Kopenhagen
      </title>
      {Array.from({ length: Math.floor((BOUNDS.lngMax - BOUNDS.lngMin) / 5) + 1 }, (_, i) => {
        const lng = Math.ceil(BOUNDS.lngMin / 5) * 5 + i * 5;
        return <line key={`m${lng}`} className="route__grid" x1={px(lng)} y1={0} x2={px(lng)} y2={H} />;
      })}
      {Array.from({ length: Math.floor((BOUNDS.latMax - BOUNDS.latMin) / 5) + 1 }, (_, i) => {
        const lat = Math.ceil(BOUNDS.latMin / 5) * 5 + i * 5;
        return <line key={`p${lat}`} className="route__grid" x1={0} y1={py(lat)} x2={W} y2={py(lat)} />;
      })}

      <path
        className="route__feeder"
        pathLength={1}
        d={`M${px(hh.lng)},${py(hh.lat)} L${px(hb.lng)},${py(hb.lat)} L${ox},${oy}`}
      />
      {DESTINATIONS.map((d) => {
        const x = px(d.lng);
        const y = py(d.lat);
        const mx = (ox + x) / 2;
        const my = (oy + y) / 2 - Math.hypot(x - ox, y - oy) * 0.14;
        return <path key={d.slug} className="route__line" pathLength={1} d={`M${ox},${oy} Q${mx},${my} ${x},${y}`} />;
      })}

      {DESTINATIONS.map((d) => (
        <g key={d.slug}>
          <circle className="route__dot route__dot--dest" cx={px(d.lng)} cy={py(d.lat)} r={8} />
          <text className="route__label" x={px(d.lng) + lab(d.slug).dx} y={py(d.lat) + lab(d.slug).dy} textAnchor={lab(d.slug).anchor ?? "start"}>
            {d.name}
          </text>
        </g>
      ))}
      {DEPARTURE_POINTS.map((d) => (
        <g key={d.slug}>
          <circle className="route__dot" cx={px(d.lng)} cy={py(d.lat)} r={12} />
          <text className="route__label route__label--origin" x={px(d.lng) + lab(d.slug).dx} y={py(d.lat) + lab(d.slug).dy} textAnchor={lab(d.slug).anchor ?? "start"}>
            {d.name} ZOB
          </text>
        </g>
      ))}
    </svg>
  );
}
