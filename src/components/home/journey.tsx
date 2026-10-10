"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motionEnv, track, whileInView, window01 } from "@/motion/engine";
import { ACTS, createJourneyFilm, type FilmHandle } from "@/scene/journey";
import { setSceneFont } from "@/scene/font";

const COPY = [
  { label: "Start", title: "Hannover ZOB.", text: "Der Bus steht bereit. Gepäck ist verstaut, die Plätze sind reserviert." },
  { label: "Abfahrt", title: "Türen zu.\nLicht an.", text: "Je nach Reise steigen Sie in Hamburg, Bremen oder Hannover zu." },
  { label: "Straße", title: "Raus aus\nder Stadt.", text: "Strecke und Pausen planen wir, bevor der Motor startet." },
  { label: "Unterwegs", title: "Norddeutschland\nzieht vorbei.", text: "Sie lehnen sich zurück. Fahren ist unser Job." },
  { label: "Europa", title: "Über die\nAlpen.", text: "Europa liegt näher, als es auf der Karte aussieht." },
  { label: "Reiseziel", title: "Nizza.", text: "Côte d’Azur – eines der Ziele aus unserem Programm." },
  { label: "Metropol Tours", title: "Wohin fahren\nwir Sie?", text: "Als Reise mit festen Terminen oder als Bus mit Fahrer für Ihre Gruppe." },
] as const;

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const track$ = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const acts = useRef<(HTMLDivElement | null)[]>([]);
  const segs = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const cv = canvas.current;
    const tr = track$.current;
    const el = root.current;
    if (!cv || !tr || !el) return;
    const env = motionEnv();
    setSceneFont(getComputedStyle(document.body).fontFamily);
    let film: FilmHandle;
    try {
      film = createJourneyFilm(cv, { maxDpr: env.maxDpr, small: env.small });
    } catch {
      return; // no canvas support: static copy remains visible
    }
    if (env.reduced) {
      film.setProgress(0.88);
      return () => film.destroy();
    }

    const apply = (p: number) => {
      film.setProgress(p);
      ACTS.forEach((a, i) => {
        const last = i === ACTS.length - 1;
        const span = a.to - a.from;
        const v = last
          ? Math.min(1, Math.max(0, (p - a.from - span * 0.05) / (span * 0.3)))
          : window01(p, a.from + span * 0.05, a.from + span * 0.3, a.to - span * 0.25, a.to - span * 0.02);
        const node = acts.current[i];
        if (node) {
          node.style.opacity = v.toFixed(3);
          node.style.transform = `translate3d(0, ${((1 - v) * 18).toFixed(1)}px, 0)`;
          node.style.visibility = v > 0.001 ? "visible" : "hidden";
          node.toggleAttribute("inert", v < 0.5);
        }
        const fill = Math.min(1, Math.max(0, (p - a.from) / span));
        const seg = segs.current[i];
        if (seg) seg.style.transform = `scaleX(${fill.toFixed(3)})`;
        labels.current[i]?.setAttribute("data-on", String(p >= a.from));
      });
    };

    const offTrack = track(tr, { start: "top top", end: "bottom bottom", onUpdate: apply });
    const offView = whileInView(el, (v) => film.setActive(v));
    return () => {
      offTrack();
      offView();
      film.destroy();
    };
  }, []);

  return (
    <section ref={root} className="journey" aria-labelledby="journey-title">
      <h2 id="journey-title" className="sr-only">
        Eine Reise mit METROPOL TOURS in sieben Akten
      </h2>
      <div ref={track$} className="journey__track">
        <div className="journey__stage">
          <canvas
            ref={canvas}
            className="journey__canvas"
            role="img"
            aria-label="Animation: Ein limettengrüner Reisebus von METROPOL TOURS fährt vom ZOB Hannover durch die Nacht, über Norddeutschland und die Alpen bis nach Nizza."
          />
          <div className="journey__bar" aria-hidden="true">
            {ACTS.map((a, i) => (
              <span key={a.id} className="journey__seg">
                <i ref={(n) => void (segs.current[i] = n)} />
              </span>
            ))}
          </div>
          <div className="journey__labels" aria-hidden="true">
            {ACTS.map((a, i) => (
              <span key={a.id} ref={(n) => void (labels.current[i] = n)}>
                {a.id} {COPY[i]!.label}
              </span>
            ))}
          </div>
          <div className="journey__acts">
            {COPY.map((c, i) => (
              <div key={c.label} ref={(n) => void (acts.current[i] = n)} className="journey__act" style={{ visibility: "hidden" }}>
                <p className="mono-label">
                  Akt {ACTS[i]!.id} · {c.label}
                </p>
                <h3>
                  {c.title.split("\n").map((l) => (
                    <span key={l} style={{ display: "block" }}>
                      {l}
                    </span>
                  ))}
                </h3>
                <p>{c.text}</p>
                {i === COPY.length - 1 ? (
                  <div className="hero__ctas">
                    <Link className="btn btn--brand btn--lg" href="/reisen" data-magnetic="0.3" data-cursor="cta">
                      Reise finden
                    </Link>
                    <Link className="btn btn--ghost-light btn--lg" href="/bus-mieten" data-magnetic="0.3">
                      Bus mieten
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <ol className="journey__static shell" style={{ position: "absolute", insetBlockEnd: "2rem", gap: "0.5rem", listStyle: "none", padding: 0 }}>
            {COPY.map((c, i) => (
              <li key={c.label}>
                <span className="mono-label">{ACTS[i]!.id}</span> {c.title.replace("\n", " ")}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
