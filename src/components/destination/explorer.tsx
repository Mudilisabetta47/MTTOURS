"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { Guide, GuidePoi } from "@/server/catalog/destinations";
import type { PoiCategory } from "@/generated/prisma/enums";
import { CATEGORY, CATEGORY_ORDER, formatDistance, formatDuration } from "./categories";

const MapCanvas = dynamic(() => import("./map-canvas"), { ssr: false, loading: () => <MapSkeleton /> });

type Profile = "walking" | "cycling" | "driving";
const PROFILE_LABEL: Record<Profile, string> = { walking: "Zu Fuß", cycling: "Fahrrad", driving: "Auto" };
const CONSENT_KEY = "mt-map-consent";

/** Only modes that make sense for the straight-line distance; public transport is not offered (no reliable data). */
function profilesFor(m: number): Profile[] {
  const out: Profile[] = [];
  if (m <= 6000) out.push("walking");
  if (m <= 20_000) out.push("cycling");
  if (m >= 1500) out.push("driving");
  return out;
}

function subscribeMq(q: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(q);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}
function useMedia(q: string) {
  return useSyncExternalStore(subscribeMq(q), () => window.matchMedia(q).matches, () => false);
}

function MapSkeleton() {
  return (
    <div className="dx-map__state dx-map__state--loading" aria-busy="true">
      <span className="dx-spin" aria-hidden="true" />
      Karte wird geladen …
    </div>
  );
}

export function CatIcon({ cat, size = 18 }: { cat: PoiCategory; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="dx-ico">
      <path d={CATEGORY[cat].icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface RouteState {
  poiId: string;
  profile: Profile;
  status: "loading" | "ok" | "none" | "error";
  distance?: number;
  duration?: number;
  geometry?: GeoJSON.LineString;
}

export function DestinationExplorer({ guide, token }: { guide: Guide; token: string | null }) {
  const mobile = useMedia("(max-width: 900px)");
  const [filter, setFilter] = useState<PoiCategory | "ALL">("ALL");
  const [selected, setSelected] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [mapState, setMapState] = useState<"idle" | "ready" | "failed">("idle");
  const [fullOpen, setFullOpen] = useState(false);
  const [route, setRoute] = useState<RouteState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const routeAbort = useRef<AbortController | null>(null);

  // remembered per browser – a convenience only, the list works without it
  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(CONSENT_KEY) === "1";
    } catch {
      // storage blocked
    }
    if (stored) queueMicrotask(() => setConsent(true));
  }, []);

  const categories = useMemo(() => CATEGORY_ORDER.filter((c) => guide.pois.some((p) => p.category === c)), [guide.pois]);
  const shown = useMemo(() => guide.pois.filter((p) => filter === "ALL" || p.category === filter), [guide.pois, filter]);
  const groups = useMemo(() => categories.filter((c) => filter === "ALL" || c === filter).map((c) => ({ c, pois: shown.filter((p) => p.category === c) })), [categories, shown, filter]);
  const sel = guide.pois.find((p) => p.id === selected) ?? null;
  const canMap = !!token;
  const mapLive = canMap && consent;

  const allow = () => {
    setConsent(true);
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // storage blocked – consent holds for this page view
    }
  };

  const select = useCallback(
    (id: string, from: "list" | "map") => {
      setSelected(id);
      setRoute((r) => (r && r.poiId !== id ? null : r));
      if (from === "map" && !mobile) {
        listRef.current?.querySelector<HTMLElement>(`[data-poi="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    },
    [mobile],
  );

  const showOnMap = (id: string) => {
    select(id, "list");
    if (mobile) setFullOpen(true);
  };

  const requestRoute = async (poi: GuidePoi, profile: Profile) => {
    if (!token) return;
    if (!consent) allow();
    select(poi.id, "list");
    if (mobile) setFullOpen(true);
    routeAbort.current?.abort();
    const ctl = new AbortController();
    routeAbort.current = ctl;
    setRoute({ poiId: poi.id, profile, status: "loading" });
    const coords = `${guide.origin.lng},${guide.origin.lat};${poi.lng},${poi.lat}`;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?geometries=geojson&overview=full&alternatives=false&access_token=${encodeURIComponent(token)}`,
        { signal: ctl.signal },
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string; routes?: { distance: number; duration: number; geometry: GeoJSON.LineString }[] };
      const r = data.routes?.[0];
      if (data.code !== "Ok" || !r) return setRoute({ poiId: poi.id, profile, status: "none" });
      setRoute({ poiId: poi.id, profile, status: "ok", distance: r.distance, duration: r.duration, geometry: r.geometry });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setRoute({ poiId: poi.id, profile, status: "error" });
    }
  };

  // Escape closes the fullscreen map on phones
  useEffect(() => {
    if (!fullOpen) return;
    document.documentElement.classList.add("sheet-open");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("sheet-open");
      window.removeEventListener("keydown", onKey);
    };
  }, [fullOpen]);

  const mapArea = (fullscreen: boolean) =>
    !canMap ? (
      <div className="dx-map__state">
        <strong>Interaktive Karte noch nicht eingerichtet</strong>
        <span>Für diese Umgebung ist kein Mapbox-Zugang hinterlegt. Alle Orte und Entfernungen finden Sie in der Liste.</span>
      </div>
    ) : !consent ? (
      <div className="dx-map__state dx-map__state--consent">
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <strong>Interaktive Karte</strong>
        <span>
          Beim Laden werden Daten wie Ihre IP-Adresse an Mapbox Inc. (USA) übertragen. Die Liste funktioniert auch ohne Karte.{" "}
          <a href="https://www.mapbox.com/legal/privacy" target="_blank" rel="noopener noreferrer">
            Datenschutz bei Mapbox
          </a>
        </span>
        <button type="button" className="btn btn--brand btn--sm" onClick={allow}>
          Interaktive Karte laden
        </button>
      </div>
    ) : mapState === "failed" ? (
      <div className="dx-map__state">
        <strong>Die interaktive Karte ist gerade nicht verfügbar.</strong>
        <span>Alle geprüften Orte und Entfernungen stehen weiterhin in der Liste.</span>
      </div>
    ) : (
      <MapCanvas
        token={token!}
        center={guide.center}
        origin={guide.origin}
        pois={guide.pois}
        visibleIds={shown.map((p) => p.id)}
        selectedId={selected}
        onSelect={(id) => select(id, "map")}
        route={route?.status === "ok" && route.geometry ? route.geometry : null}
        cooperative={!fullscreen}
        onState={(s) => setMapState(s)}
      />
    );

  const routeInfo = (poi: GuidePoi) =>
    route && route.poiId === poi.id ? (
      <p className="dx-route" role="status">
        {route.status === "loading"
          ? "Route wird berechnet …"
          : route.status === "ok"
            ? `${PROFILE_LABEL[route.profile]}: ${formatDistance(route.distance!)} · ca. ${formatDuration(route.duration!)} (Mapbox-Routing ab ${guide.origin.label})`
            : route.status === "none"
              ? "Für dieses Verkehrsmittel ist keine Route verfügbar."
              : "Die Route konnte gerade nicht berechnet werden."}
      </p>
    ) : null;

  const actions = (poi: GuidePoi) => (
    <div className="dx-poi__actions">
      {canMap ? (
        <button type="button" className="dx-btn" onClick={() => showOnMap(poi.id)}>
          Auf Karte zeigen
        </button>
      ) : null}
      {canMap
        ? profilesFor(poi.crowMeters).map((p) => (
            <button
              key={p}
              type="button"
              className="dx-btn dx-btn--ghost"
              aria-pressed={route?.poiId === poi.id && route.profile === p}
              onClick={() => requestRoute(poi, p)}
            >
              Route · {PROFILE_LABEL[p]}
            </button>
          ))
        : null}
    </div>
  );

  return (
    <div className="dx" data-map={mapLive ? mapState : "off"}>
      <div className="dx-chips" role="toolbar" aria-label="Kategorien filtern">
        <button type="button" className="dx-chip" aria-pressed={filter === "ALL"} onClick={() => setFilter("ALL")}>
          Alle <span className="tabular">{guide.pois.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c} type="button" className="dx-chip" aria-pressed={filter === c} onClick={() => setFilter(c)}>
            <CatIcon cat={c} size={16} />
            {CATEGORY[c].label} <span className="tabular">{guide.pois.filter((p) => p.category === c).length}</span>
          </button>
        ))}
      </div>

      <div className="dx-body">
        <div className="dx-list" ref={listRef}>
          <p className="dx-origin-note">
            <span className="dx-origin-dot" aria-hidden="true" />
            Entfernungen in Luftlinie ab <strong>{guide.origin.label}</strong>
            {guide.origin.kind === "reference" ? " – die Unterkunft steht noch nicht fest." : "."}
          </p>
          {groups.map((g) => (
            <section key={g.c} className="dx-group" aria-labelledby={`dx-h-${g.c}`}>
              <h3 id={`dx-h-${g.c}`}>{CATEGORY[g.c].heading(guide.name)}</h3>
              <ul>
                {g.pois.map((p) => (
                  <li key={p.id} className="dx-poi" data-poi={p.id} data-on={p.id === selected ? "true" : "false"}>
                    <button type="button" className="dx-poi__main" onClick={() => select(p.id, "list")} aria-pressed={p.id === selected}>
                      <span className="dx-poi__icon">
                        <CatIcon cat={p.category} />
                      </span>
                      <span className="dx-poi__text">
                        <strong>{p.name}</strong>
                        <span>{p.description ?? CATEGORY[p.category].one}</span>
                      </span>
                      <span className="dx-poi__dist">
                        <span className="tabular">{formatDistance(p.crowMeters)}</span>
                        <small>Luftlinie</small>
                      </span>
                    </button>
                    {p.id === selected ? (
                      <div className="dx-poi__more">
                        {actions(p)}
                        {routeInfo(p)}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {!mobile ? <div className="dx-map">{mapArea(false)}</div> : null}
      </div>

      {mobile && canMap ? (
        <button type="button" className="btn btn--brand dx-open-map" onClick={() => setFullOpen(true)}>
          Karte ansehen
        </button>
      ) : null}

      {mobile && fullOpen
        ? createPortal(
            <div className="dx-full" role="dialog" aria-modal="true" aria-label={`Karte ${guide.name}`}>
              <header className="dx-full__bar">
                <button type="button" className="dx-btn" onClick={() => setFullOpen(false)} autoFocus>
                  ← Zur Liste
                </button>
                <strong>{guide.name}</strong>
              </header>
              <div className="dx-full__map">{mapArea(true)}</div>
              {sel ? (
                <div className="dx-full__card">
                  <span className="dx-poi__icon">
                    <CatIcon cat={sel.category} />
                  </span>
                  <div>
                    <strong>{sel.name}</strong>
                    <span>
                      {CATEGORY[sel.category].one} · {formatDistance(sel.crowMeters)} Luftlinie
                    </span>
                    {actions(sel)}
                    {routeInfo(sel)}
                  </div>
                </div>
              ) : (
                <p className="dx-full__hint">Tippen Sie auf einen Ort, um Details zu sehen.</p>
              )}
            </div>,
            document.body,
          )
        : null}

      <p className="dx-attr">
        Ortsdaten: {guide.attributions.join(" · ") || "redaktionell gepflegt"}. Entfernungen sind Luftlinie; Wege berechnet auf Wunsch das Mapbox-Routing.
      </p>
    </div>
  );
}
