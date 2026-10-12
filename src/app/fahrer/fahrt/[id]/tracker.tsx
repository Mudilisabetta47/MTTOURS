"use client";

import { useEffect, useRef, useState } from "react";

const SEND_EVERY_MS = 15_000;

type Status = { kind: "starting" | "ok" | "denied" | "unavailable" | "error"; text: string };

/**
 * Sends the phone's GPS position while the run is in progress and this page is open.
 * Keeps the screen awake where supported; nothing runs in the background after leaving the page.
 */
export function Tracker({ runId }: { runId: string }) {
  const [status, setStatus] = useState<Status>({ kind: "starting", text: "Standort wird ermittelt …" });
  const [sent, setSent] = useState<{ at: number; accuracy: number | null } | null>(null);
  const [clock, setClock] = useState(0);
  const lastSend = useRef(0);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setStatus({ kind: "unavailable", text: "Dieses Gerät bietet keine Standortfreigabe." }));
      return;
    }
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});

    const watch = navigator.geolocation.watchPosition(
      async (p) => {
        const now = Date.now();
        if (now - lastSend.current < SEND_EVERY_MS) return;
        lastSend.current = now;
        try {
          const res = await fetch("/api/fahrer/position", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              runId,
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              accuracy: p.coords.accuracy ?? null,
              speed: p.coords.speed ?? null,
              heading: p.coords.heading != null && !Number.isNaN(p.coords.heading) ? p.coords.heading : null,
              at: Math.round(p.timestamp),
            }),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) {
            setStatus({ kind: "error", text: data.error ?? "Übertragung fehlgeschlagen – wird erneut versucht." });
            lastSend.current = 0;
            return;
          }
          setSent({ at: now, accuracy: p.coords.accuracy ?? null });
          setClock(now);
          setStatus({ kind: "ok", text: "Standort wird gesendet" });
        } catch {
          setStatus({ kind: "error", text: "Keine Verbindung – wird erneut versucht." });
          lastSend.current = 0;
        }
      },
      (err) => {
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? { kind: "denied", text: "Standortfreigabe abgelehnt. Bitte in den Browser-Einstellungen erlauben." }
            : { kind: "error", text: "Standort gerade nicht verfügbar." },
        );
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
    const i = window.setInterval(() => setClock(Date.now()), 5_000);
    return () => {
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(i);
      lock?.release().catch(() => {});
    };
  }, [runId]);

  const ago = sent ? Math.max(0, Math.round((clock - sent.at) / 1000)) : null;
  return (
    <div className="drv-track" data-kind={status.kind} role="status" aria-live="polite">
      <span className="drv-track__dot" aria-hidden="true" />
      <div>
        <strong>{status.text}</strong>
        <span>
          {ago !== null ? `Letzte Übertragung vor ${ago} s` : "Noch keine Übertragung"}
          {sent?.accuracy ? ` · Genauigkeit ca. ${Math.round(sent.accuracy)} m` : ""}
        </span>
        <small>Bitte diese Seite während der Fahrt geöffnet lassen. Fahrgäste sehen den Standort nur während der Fahrt.</small>
      </div>
    </div>
  );
}
