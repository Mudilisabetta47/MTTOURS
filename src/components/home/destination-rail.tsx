"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motionEnv, refreshAll, track } from "@/motion/engine";
import { DEPARTURE_POINTS, DESTINATIONS, distanceKm, formatCoord } from "@/content/places";

const HANNOVER = DEPARTURE_POINTS.find((d) => d.slug === "hannover")!;

/** Horizontal destination rail: vertical scroll distance is mapped onto a horizontal translation. */
export function DestinationRail() {
  const section = useRef<HTMLElement>(null);
  const trackEl = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sec = section.current;
    const tr = trackEl.current;
    const rw = row.current;
    if (!sec || !tr || !rw || motionEnv().reduced) return;

    const measure = () => {
      const shift = Math.max(0, rw.scrollWidth - window.innerWidth);
      sec.style.setProperty("--rail-shift", `${shift}px`);
      sec.style.setProperty("--rail-track", `${shift + window.innerHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(() => {
      measure();
      refreshAll();
    });
    ro.observe(rw);
    const off = track(tr, { start: "top top", end: "bottom bottom", onUpdate: (p) => sec.style.setProperty("--p", p.toFixed(4)) });
    return () => {
      ro.disconnect();
      off();
    };
  }, []);

  return (
    <section ref={section} className="rail" aria-labelledby="rail-title">
      <div ref={trackEl} className="rail__track">
        <div className="rail__stage">
          <div className="shell rail__head">
            <div className="sec-head" style={{ marginBlockEnd: 0 }}>
              <p className="mono-label">05 · Reiseziele</p>
              <h2 id="rail-title">Ziele aus unserem Programm.</h2>
            </div>
            <span className="rail__progress" aria-hidden="true">
              <i />
            </span>
          </div>
          <div ref={row} className="rail__row">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.slug}
                href={`/reisen?ziel=${d.slug}` as never}
                className="dest"
                style={{ "--a": d.tone[0], "--b": d.tone[1] } as React.CSSProperties}
                data-cursor="cta"
                data-cursor-label="Termine"
              >
                <span className="dest__top">
                  <span>{d.country}</span>
                  <span>{d.format}</span>
                </span>
                <span className="dest__name">{d.name}</span>
                <span className="dest__meta">
                  <strong>{distanceKm(HANNOVER, d).toLocaleString("de-DE")} km Luftlinie ab Hannover</strong>
                  <span>{formatCoord(d.lat, d.lng)}</span>
                </span>
              </Link>
            ))}
            <div className="dest dest--cta">
              <h3 style={{ fontSize: "var(--step-3)", letterSpacing: "var(--track-display)" }}>Ihr Ziel ist nicht dabei?</h3>
              <p>Für Gruppen fahren wir auch dorthin, wo kein Katalog hinführt.</p>
              <Link className="btn btn--brand" href="/bus-mieten#anfrage">
                Gruppenreise anfragen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
