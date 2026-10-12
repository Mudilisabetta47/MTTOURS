"use client";

import { useEffect, useState } from "react";
import type { LiveView } from "@/server/live/tracking";

const POLL_MS = 15_000;
const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });

function km(m: number) {
  return m < 1000 ? `${Math.max(50, Math.round(m / 50) * 50)} m` : `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace(".", ",")} km`;
}

/** Live position of the customer's own bus. Only real positions; the distance is a straight line, no ETA. */
export function LiveTracker({ orderId, token }: { orderId: string; token: string }) {
  const [view, setView] = useState<LiveView | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/live?o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.ok && alive) {
          setView((await res.json()) as LiveView);
          setNow(Date.now());
        }
      } catch {
        // keep the last state; next poll retries
      }
    };
    load();
    const i = window.setInterval(load, POLL_MS);
    const onVis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(i);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [orderId, token]);

  if (!view) return null;
  if (view.state === "none") {
    return (
      <section className="live live--idle" aria-label="Live-Verfolgung">
        <span className="live__dot" aria-hidden="true" />
        <div>
          <strong>Live-Verfolgung</strong>
          <p>Sobald Ihr Fahrer die Fahrt startet, sehen Sie hier, wo Ihr Bus gerade ist.</p>
        </div>
      </section>
    );
  }
  if (view.state === "finished") {
    return (
      <section className="live live--idle" aria-label="Live-Verfolgung">
        <span className="live__dot" aria-hidden="true" />
        <div>
          <strong>Die Fahrt ist beendet.</strong>
          <p>Vielen Dank, dass Sie mit METROPOL TOURS gereist sind.</p>
        </div>
      </section>
    );
  }
  const v = view.vehicle;
  const ageMin = v ? Math.max(0, Math.round((now - Date.parse(v.at)) / 60_000)) : null;
  return (
    <section className="live" data-state={view.state} aria-label="Live-Verfolgung" aria-live="polite">
      <header className="live__head">
        <span className="live__dot" aria-hidden="true" />
        <div>
          <strong>{view.state === "live" ? "Ihr Bus ist unterwegs" : view.state === "stale" ? "Verbindung zum Bus unterbrochen" : "Fahrt gestartet"}</strong>
          <span>
            {v
              ? `Standort ${ageMin === 0 ? "gerade eben" : `vor ${ageMin} Min.`} (${tFmt.format(new Date(v.at))} Uhr)${v.speedKmh != null && view.state === "live" ? ` · ${Math.round(v.speedKmh)} km/h` : ""}`
              : "Der Standort wird gleich übertragen."}
          </span>
        </div>
      </header>
      {view.stop ? (
        <div className="live__stop">
          <div>
            <span className="live__label">Ihr Zustieg</span>
            <strong>{view.stop.name}</strong>
            <span>Geplante Abfahrt {tFmt.format(new Date(view.stop.plannedAt))} Uhr</span>
          </div>
          {view.crowMeters != null ? (
            <div className="live__dist">
              <span className="live__label">Entfernung</span>
              <strong className="tabular">{km(view.crowMeters)}</strong>
              <span>Luftlinie zum Zustieg</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {v ? (
        <a className="btn btn--ghost btn--sm live__map" href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=14/${v.lat}/${v.lng}`} target="_blank" rel="noopener noreferrer">
          Standort auf der Karte ansehen ↗
        </a>
      ) : null}
      <p className="live__fine">Der Standort kommt direkt vom Bus und wird alle 15 Sekunden aktualisiert. Eine Ankunftszeit berechnen wir nicht – bei Fragen: Hotline.</p>
    </section>
  );
}
