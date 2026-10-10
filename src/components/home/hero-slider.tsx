"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface HeroSlide {
  src: string;
  alt: string;
  label: string;
  /** AI-generated images are always labelled as such */
  ki: boolean;
  position?: string;
}

const DURATION = 7000;

function subscribeReduced(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * Crossfading hero background with a slow zoom. The headline stays the same (one H1 for SEO);
 * only the pictures change. Autoplay pauses on hover/focus, in background tabs, on request and
 * never runs with reduced motion.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hold, setHold] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const running = !paused && !hold && !tabHidden && !reduced && slides.length > 1;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setI((x) => (x + 1) % slides.length), DURATION);
    return () => window.clearTimeout(t);
  }, [i, running, slides.length]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const current = slides[i]!;
  return (
    <>
      <div className="hero__media hslider" aria-hidden="true">
        {slides.map((s, n) => (
          <div key={s.src} className="hslider__slide" data-on={n === i ? "true" : "false"}>
            <Image src={s.src} alt="" fill priority={n === 0} sizes="100vw" quality={80} style={{ objectPosition: s.position ?? "60% 55%" }} />
          </div>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        Bild {i + 1} von {slides.length}: {current.alt}
      </p>
      <span className="hslider__tag">{current.ki ? "KI-generiert" : "Echtes Foto"}</span>

      <div
        className="hslider__nav shell"
        role="group"
        aria-roledescription="Bildwechsel"
        aria-label="Titelbilder"
        onPointerEnter={() => setHold(true)}
        onPointerLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
      >
        <ol className="hslider__dots">
          {slides.map((s, n) => (
            <li key={s.src}>
              <button type="button" className="hslider__dot" aria-current={n === i ? "true" : undefined} onClick={() => setI(n)}>
                <span className="hslider__label">{s.label}</span>
                <span className="hslider__bar" aria-hidden="true">
                  <span key={n === i ? `on-${i}` : "off"} className="hslider__fill" data-run={n === i && running ? "true" : "false"} style={{ animationDuration: `${DURATION}ms` }} />
                </span>
              </button>
            </li>
          ))}
        </ol>
        {slides.length > 1 && !reduced ? (
          <button type="button" className="hslider__pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Bildwechsel fortsetzen" : "Bildwechsel anhalten"}>
            {paused ? (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </>
  );
}
