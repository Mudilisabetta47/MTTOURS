import type { TripDetail } from "@/server/catalog/trips";
import type { Guide } from "@/server/catalog/destinations";
import { COMPANY } from "@/content/company";
import { BUSINESS_TZ } from "@/lib/time";
import { formatEur } from "@/lib/money";

const dFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });

/* Playful "sticker" icons in the Metropol palette – filled shapes with a dark outline. */
const INK = "#0d1110";
function Sticker({ kind }: { kind: "crown" | "thumb" | "peace" | "smile" }) {
  const common = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 64 64" width="58" height="58" aria-hidden="true" className="thl__sticker">
      {kind === "crown" ? (
        <>
          <path d="M10 24 20 34l12-16 12 16 10-10-4 26H14L10 24Z" fill="#0ac55c" {...common} />
          <path d="M14 44h36" {...common} fill="none" />
          <circle cx="32" cy="12" r="3.5" fill="#8cc63f" {...common} />
          <circle cx="8" cy="20" r="3" fill="#8cc63f" {...common} />
          <circle cx="56" cy="20" r="3" fill="#8cc63f" {...common} />
          <path d="M24 6l2 4M40 6l-2 4" {...common} fill="none" />
        </>
      ) : kind === "thumb" ? (
        <>
          <path d="M8 30h10v26H8z" fill="#8cc63f" {...common} />
          <path d="M18 32c6-4 10-10 12-20 1-5 9-4 8 3l-2 11h14c4 0 6 4 5 7l-4 18c-1 3-3 5-6 5H18V32Z" fill="#0ac55c" {...common} />
          <path d="M44 38h8M42 46h8" {...common} fill="none" />
        </>
      ) : kind === "peace" ? (
        <>
          <path d="M22 34 16 10c-1-4 5-6 6-2l6 20 2-22c0-4 7-4 7 0l-1 26c3-2 8-1 9 3 4 0 6 4 4 7-1 6-6 14-15 14h-4c-8 0-13-6-12-13l4-9Z" fill="#0ac55c" {...common} />
          <path d="M30 40c4-1 8 0 10 3" {...common} fill="none" />
          <path d="M50 10l3-4M54 16l5-1M8 16l-4-2" {...common} fill="none" />
        </>
      ) : (
        <>
          <circle cx="32" cy="32" r="24" fill="#0ac55c" {...common} />
          <circle cx="24" cy="27" r="3" fill={INK} />
          <circle cx="40" cy="27" r="3" fill={INK} />
          <path d="M21 37c4 7 18 7 22 0" {...common} fill="none" />
          <circle cx="18" cy="35" r="3" fill="#8cc63f" />
          <circle cx="46" cy="35" r="3" fill="#8cc63f" />
        </>
      )}
    </svg>
  );
}

/** Colourful "at a glance" band. Only data from the trip, its dates and its destination guide – never invented. */
export function TripHighlights({ t, guide }: { t: TripDetail; guide: Guide | null }) {
  const isPackage = t.productType === "PACKAGE_TOUR";
  const next = t.departures.find((d) => d.state === "BOOKABLE");
  const cities = [...new Set((next?.stops.map((s) => s.city) ?? []).concat(t.pickups.map((p) => p.city)))];

  const facts: string[] = [
    t.durationDays <= 1 ? "Tagesfahrt" : t.durationNights > 0 ? `${t.durationDays} Tage, ${t.durationNights} Übernachtungen` : `${t.durationDays} Tage`,
    isPackage ? "Pauschalreise mit Busfahrt" : "Busfahrt, Unterkunft wählen Sie selbst",
    ...(cities.length ? [`Abfahrt ab ${cities.join(", ")}`] : []),
    ...(t.hotelName ? [`${t.hotelName}${t.hotelStars ? ` (${t.hotelStars}★)` : ""}`] : []),
    next ? `Nächster Termin: ${dFmt.format(next.departAt)}` : t.state === "SOLD_OUT" ? "Aktuelle Termine ausgebucht" : "Neue Termine in Planung",
  ];

  const inclusive = [...t.included, ...t.optionalServices.map((o) => `Zubuchbar: ${o.name} (${formatEur(o.priceCents)}${o.unit === "PER_PERSON" ? " p. P." : ""})`)];

  const expect: string[] = t.itinerary.length
    ? t.itinerary.slice(0, 5).map((d) => `Tag ${d.dayNumber}: ${d.title}`)
    : guide?.pois.some((p) => p.isHighlight)
      ? guide.pois
          .filter((p) => p.isHighlight)
          .slice(0, 4)
          .map((p) => (p.highlightText ? `${p.name} – ${p.highlightText}` : p.name))
      : t.highlights.slice(0, 5);

  const good: string[] = [
    ...(next?.stops.length
      ? [`Zustieg: ${next.stops.map((s) => `${s.city} ${tFmt.format(s.plannedAt)} Uhr`).join(", ")}`]
      : t.pickups.some((p) => p.localTime)
        ? [`Zustieg ca.: ${t.pickups.filter((p) => p.localTime).map((p) => `${p.city} ${p.localTime}`).join(", ")}`]
        : []),
    "Sicher online bezahlen, Ticket mit QR-Code per E-Mail",
    ...(t.insolvencyProtected ? ["Mit Sicherungsschein abgesichert"] : []),
    `Persönlich erreichbar: ${COMPANY.phoneDisplay}`,
  ];

  const cols = [
    { kind: "crown" as const, title: "Fakten", items: facts },
    { kind: "thumb" as const, title: "Inklusive", items: inclusive, empty: "Die Leistungen veröffentlichen wir mit dem Termin." },
    { kind: "peace" as const, title: t.itinerary.length ? "Reiseprogramm" : "Das erwartet Sie", items: expect, empty: "Das Programm folgt mit dem Termin." },
    { kind: "smile" as const, title: "Gut zu wissen", items: good },
  ];

  return (
    <section className="thl" aria-label="Die Reise auf einen Blick">
      <div className="thl__grid">
        {cols.map((c, i) => (
          <div key={c.title} className="thl__col" data-reveal="up" style={{ "--rv-delay": `${i * 90}ms` } as React.CSSProperties}>
            <Sticker kind={c.kind} />
            <div>
              <h3>{c.title}</h3>
              {c.items.length ? (
                <ul>
                  {c.items.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="thl__empty">{c.empty}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="thl__voice">
        <span aria-hidden="true">💬</span> Schon mit uns gereist? Erzählen Sie uns, wie es war –{" "}
        <a href={`mailto:${COMPANY.email}?subject=${encodeURIComponent(`Mein Reisebericht: ${t.title}`)}`}>Erfahrung teilen</a>. Echte Stimmen unserer Gäste zeigen wir hier, sobald sie da sind.
      </p>
    </section>
  );
}

/** Big emotional photo moment with the brand line. */
export function TripMood({ t, children }: { t: TripDetail; children: React.ReactNode }) {
  const img = t.media[1] ?? t.media[0];
  return (
    <section className="tmood" aria-label="Urlaubsgefühl">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- local, pre-sized WebP from the media store
        <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy" className="tmood__img" />
      ) : null}
      <div className="tmood__shade" aria-hidden="true" />
      <div className="tmood__text">
        <p className="tmood__line">
          Einsteigen. <span>Ankommen.</span> Urlaub.
        </p>
        <p className="tmood__sub">
          {t.destination} wartet – wir bringen Sie hin{t.pickups.length ? `, ab ${[...new Set(t.pickups.map((p) => p.city))].join(", ")}` : ""}.
        </p>
        {children}
      </div>
      {img && !img.rightsConfirmed ? <span className="tmood__tag">Bildrechte ungeprüft</span> : null}
    </section>
  );
}
