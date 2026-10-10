import type { Guide } from "@/server/catalog/destinations";
import { CATEGORY, formatDistance } from "./categories";
import { CatIcon, DestinationExplorer } from "./explorer";

/**
 * "Entdecke dein Reiseziel": editorial highlights + explorer. Everything important is plain HTML,
 * the map is an optional layer on top that loads only on request.
 */
export function DestinationSection({ guide }: { guide: Guide }) {
  const highlights = guide.pois.filter((p) => p.isHighlight).slice(0, 5);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.") ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : null;
  return (
    <section id="umgebung" className="tp-sec dsec" aria-labelledby="h-umgebung">
      <p className="dsec__kicker">Was kann man in {guide.name} unternehmen?</p>
      <h2 id="h-umgebung">Entdecke dein Reiseziel.</h2>
      <p className="tp-sub">{guide.intro ?? `Strände, Sehenswürdigkeiten und besondere Orte – entdecken Sie, was Sie in ${guide.name} erwartet.`}</p>

      {guide.pois.length === 0 ? (
        <div className="tp-empty">
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
          <div>
            <strong>Der Ortsführer für {guide.name} entsteht gerade.</strong>
            <p>Wir zeigen hier nur Orte, deren Lage wir geprüft haben – sie folgen in Kürze.</p>
          </div>
        </div>
      ) : (
        <>
          {highlights.length ? (
            <div className="dhl">
              <h3>Unsere Highlights vor Ort</h3>
              <ul className="dhl__grid">
                {highlights.map((p) => (
                  <li key={p.id} className="dhl__card">
                    {p.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local media store
                      <img src={p.photo.src} alt={p.photo.alt} width={p.photo.width} height={p.photo.height} loading="lazy" />
                    ) : (
                      <span className="dhl__icon">
                        <CatIcon cat={p.category} size={22} />
                      </span>
                    )}
                    <span className="dhl__cat">{CATEGORY[p.category].one}</span>
                    <strong>{p.name}</strong>
                    {p.highlightText ? <p>{p.highlightText}</p> : null}
                    <span className="dhl__dist">
                      {formatDistance(p.crowMeters)} Luftlinie ab {guide.origin.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <DestinationExplorer guide={guide} token={token ?? null} />
        </>
      )}
    </section>
  );
}
