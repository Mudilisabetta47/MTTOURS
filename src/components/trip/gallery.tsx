"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TripMediaItem } from "@/server/catalog/trips";

function RightsBadge({ m }: { m: TripMediaItem }) {
  if (m.isAiGenerated) return <span className="gal__badge">KI-generiert</span>;
  // only reachable outside production – production filters unconfirmed media on the server
  if (!m.rightsConfirmed) return <span className="gal__badge gal__badge--warn">Bildrechte ungeprüft</span>;
  return null;
}

/** Main image + up to four tiles, mobile swipe strip, fullscreen lightbox with keyboard and swipe. */
export function TripGallery({ media, title }: { media: TripMediaItem[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const n = media.length;

  const open = (i: number, from: HTMLElement) => {
    openerRef.current = from;
    setIndex(i);
    dialogRef.current?.showModal();
  };
  const close = useCallback(() => dialogRef.current?.close(), []);
  const go = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      setIndex(null);
      openerRef.current?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    dlg.addEventListener("close", onClose);
    dlg.addEventListener("keydown", onKey);
    return () => {
      dlg.removeEventListener("close", onClose);
      dlg.removeEventListener("keydown", onKey);
    };
  }, [go]);

  if (!n) return null;
  const current = index === null ? null : media[index];

  return (
    <section className="gal" aria-label={`Fotos: ${title}`} data-count={Math.min(n, 5)}>
      {/* desktop mosaic */}
      <div className="gal__grid">
        {media.slice(0, 5).map((m, i) => (
          <button
            key={m.src}
            type="button"
            className={i === 0 ? "gal__tile gal__tile--main" : "gal__tile"}
            onClick={(e) => open(i, e.currentTarget)}
            aria-label={`Foto ${i + 1} von ${n} vergrößern: ${m.alt}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local, pre-sized WebP from the media store */}
            <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading={i === 0 ? "eager" : "lazy"} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" />
            {i === 0 ? <RightsBadge m={m} /> : null}
          </button>
        ))}
        {n > 1 ? (
          <button type="button" className="gal__all" onClick={(e) => open(0, e.currentTarget)}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Alle {n} Fotos ansehen
          </button>
        ) : null}
      </div>

      {/* mobile swipe strip */}
      <div
        className="gal__strip"
        onScroll={(e) => {
          const el = e.currentTarget;
          setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {media.map((m, i) => (
          <button key={m.src} type="button" className="gal__slide" onClick={(e) => open(i, e.currentTarget)} aria-label={`Foto ${i + 1} von ${n} vergrößern`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local, pre-sized WebP from the media store */}
            <img src={m.src} alt={m.alt} width={m.width} height={m.height} loading={i === 0 ? "eager" : "lazy"} decoding="async" />
          </button>
        ))}
      </div>
      {n > 1 ? (
        <p className="gal__count tabular" aria-hidden="true">
          {slide + 1} / {n}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        className="lbx"
        aria-label={`Fotogalerie ${title}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) touch.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          const t = e.changedTouches[0];
          touch.current = null;
          if (!s || !t) return;
          const dx = t.clientX - s.x;
          if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(t.clientY - s.y)) go(dx < 0 ? 1 : -1);
        }}
      >
        {current ? (
          <div className="lbx__frame">
            <header className="lbx__bar">
              <span className="tabular">
                {index! + 1} / {n}
              </span>
              <button type="button" className="lbx__close" onClick={close} autoFocus>
                <span className="sr-only">Galerie schließen</span>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <figure className="lbx__fig" key={current.src}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local, pre-sized WebP from the media store */}
              <img src={current.src} alt={current.alt} width={current.width} height={current.height} />
              <figcaption>
                {current.alt}
                <RightsBadge m={current} />
              </figcaption>
            </figure>
            {n > 1 ? (
              <>
                <button type="button" className="lbx__nav lbx__nav--prev" onClick={() => go(-1)}>
                  <span className="sr-only">Vorheriges Foto</span>
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <button type="button" className="lbx__nav lbx__nav--next" onClick={() => go(1)}>
                  <span className="sr-only">Nächstes Foto</span>
                  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                    <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
                <ol className="lbx__thumbs">
                  {media.map((m, i) => (
                    <li key={m.src}>
                      <button type="button" aria-current={i === index ? "true" : undefined} onClick={() => setIndex(i)} aria-label={`Foto ${i + 1}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of the same local file */}
                        <img src={m.src} alt="" width={m.width} height={m.height} loading="lazy" />
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
        ) : null}
      </dialog>
    </section>
  );
}
