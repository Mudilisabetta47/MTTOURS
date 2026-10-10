"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GuidePoi } from "@/server/catalog/destinations";
import type { PoiCategory } from "@/generated/prisma/enums";
import { CATEGORY, formatDistance } from "./categories";

export interface MapCanvasProps {
  token: string;
  center: { lat: number; lng: number; zoom: number };
  origin: { label: string; lat: number; lng: number };
  pois: GuidePoi[];
  /** fit the view to these (filtered) ids */
  visibleIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  route: GeoJSON.LineString | null;
  /** inline maps must not hijack page scrolling (two-finger / ctrl+wheel) */
  cooperative: boolean;
  onState: (s: "ready" | "failed") => void;
}

const GREEN = "#068541";

function iconImage(cat: PoiCategory, selected: boolean): Promise<HTMLImageElement> {
  const size = selected ? 52 : 40;
  const r = size / 2 - 3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${selected ? GREEN : "#ffffff"}" stroke="${selected ? "#ffffff" : GREEN}" stroke-width="${selected ? 3 : 2}"/>
    <g transform="translate(${size / 2 - (selected ? 12 : 10)} ${size / 2 - (selected ? 12 : 10)}) scale(${selected ? 1 : 0.84})">
      <path d="${CATEGORY[cat].icon}" fill="none" stroke="${selected ? "#ffffff" : "#0d1110"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g></svg>`;
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function popupNode(p: GuidePoi, originLabel: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "dx-pop";
  const meta = document.createElement("span");
  meta.className = "dx-pop__meta";
  meta.textContent = CATEGORY[p.category].one;
  const name = document.createElement("strong");
  name.textContent = p.name;
  el.append(meta, name);
  if (p.description) {
    const d = document.createElement("p");
    d.textContent = p.description;
    el.append(d);
  }
  const dist = document.createElement("span");
  dist.className = "dx-pop__dist";
  dist.textContent = `${formatDistance(p.crowMeters)} Luftlinie ab ${originLabel}`;
  el.append(dist);
  return el;
}

function collection(pois: GuidePoi[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: pois.map((p) => ({ type: "Feature", id: p.id, properties: { id: p.id, cat: p.category }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
  };
}

export default function MapCanvas(props: MapCanvasProps) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const ready = useRef(false);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  // create once, destroy on unmount
  useEffect(() => {
    if (!box.current) return;
    const p = latest.current;
    let failed = false;
    const fail = () => {
      if (failed) return;
      failed = true;
      latest.current.onState("failed");
    };
    let m: mapboxgl.Map;
    try {
      m = new mapboxgl.Map({
        container: box.current,
        accessToken: p.token,
        style: "mapbox://styles/mapbox/light-v11",
        center: [p.center.lng, p.center.lat],
        zoom: p.center.zoom,
        cooperativeGestures: p.cooperative,
        performanceMetricsCollection: false,
        pitchWithRotate: false,
        dragRotate: false,
        maxPitch: 0,
        locale: {
          "ScrollZoomBlocker.CtrlMessage": "Zum Zoomen Strg + Scrollen verwenden",
          "ScrollZoomBlocker.CmdMessage": "Zum Zoomen ⌘ + Scrollen verwenden",
          "TouchPanBlocker.Message": "Karte mit zwei Fingern bewegen",
          "NavigationControl.ZoomIn": "Vergrößern",
          "NavigationControl.ZoomOut": "Verkleinern",
        },
      });
    } catch {
      fail();
      return;
    }
    map.current = m;
    const timeout = window.setTimeout(() => !ready.current && fail(), 15_000);
    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    m.on("error", (e) => {
      const status = (e.error as { status?: number } | undefined)?.status;
      if (!ready.current || status === 401 || status === 403) fail();
    });

    m.on("load", async () => {
      const cats = Object.keys(CATEGORY) as PoiCategory[];
      try {
        await Promise.all(
          cats.flatMap((c) => [
            iconImage(c, false).then((img) => m.addImage(`poi-${c}`, img, { pixelRatio: 2 })),
            iconImage(c, true).then((img) => m.addImage(`poi-sel-${c}`, img, { pixelRatio: 2 })),
          ]),
        );
      } catch {
        fail();
        return;
      }
      m.addSource("pois", { type: "geojson", data: collection(latest.current.pois), cluster: true, clusterMaxZoom: 14, clusterRadius: 44 });
      m.addSource("route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "route-casing", type: "line", source: "route", paint: { "line-color": "#ffffff", "line-width": 8 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": GREEN, "line-width": 4.5 }, layout: { "line-cap": "round", "line-join": "round" } });
      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "pois",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#ffffff", "circle-stroke-color": GREEN, "circle-stroke-width": 2, "circle-radius": ["step", ["get", "point_count"], 17, 6, 21] },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pois",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 13, "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"] },
        paint: { "text-color": "#0d1110" },
      });
      m.addLayer({
        id: "poi",
        type: "symbol",
        source: "pois",
        filter: ["!", ["has", "point_count"]],
        layout: { "icon-image": ["concat", "poi-", ["get", "cat"]], "icon-allow-overlap": true, "icon-ignore-placement": true },
      });
      m.addLayer({
        id: "poi-selected",
        type: "symbol",
        source: "pois",
        filter: ["==", ["get", "id"], ""],
        layout: { "icon-image": ["concat", "poi-sel-", ["get", "cat"]], "icon-allow-overlap": true, "icon-ignore-placement": true },
      });

      const o = latest.current.origin;
      const pin = document.createElement("div");
      pin.className = "dx-origin";
      pin.title = `Bezugspunkt: ${o.label}`;
      pin.setAttribute("aria-label", `Bezugspunkt für Entfernungen: ${o.label}`);
      new mapboxgl.Marker({ element: pin }).setLngLat([o.lng, o.lat]).addTo(m);

      m.on("click", "poi", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") latest.current.onSelect(id);
      });
      m.on("click", "clusters", (e) => {
        const f = e.features?.[0];
        const src = m.getSource("pois") as mapboxgl.GeoJSONSource | undefined;
        if (!f || !src) return;
        src.getClusterExpansionZoom(f.properties?.cluster_id, (err, zoom) => {
          if (err || zoom == null) return;
          m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
        });
      });
      for (const layer of ["poi", "clusters"]) {
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }
      ready.current = true;
      window.clearTimeout(timeout);
      latest.current.onState("ready");
      fit(m, latest.current, false);
      sync(m);
    });

    return () => {
      window.clearTimeout(timeout);
      popup.current?.remove();
      m.remove();
      map.current = null;
      ready.current = false;
    };
  }, []);

  function fit(m: mapboxgl.Map, p: MapCanvasProps, animate = true) {
    const ids = new Set(p.visibleIds);
    const shown = p.pois.filter((x) => ids.has(x.id));
    // airports would zoom the city view out to the whole region – only frame them when they are filtered
    const frame = shown.some((x) => x.category !== "AIRPORT") ? shown.filter((x) => x.category !== "AIRPORT") : shown;
    if (!frame.length) return;
    const b = new mapboxgl.LngLatBounds();
    frame.forEach((x) => b.extend([x.lng, x.lat]));
    b.extend([p.origin.lng, p.origin.lat]);
    m.fitBounds(b, { padding: 56, maxZoom: 15, duration: animate ? 900 : 0 });
  }

  function sync(m: mapboxgl.Map) {
    const p = latest.current;
    const ids = new Set(p.visibleIds);
    (m.getSource("pois") as mapboxgl.GeoJSONSource | undefined)?.setData(collection(p.pois.filter((x) => ids.has(x.id))));
    m.setFilter("poi-selected", ["==", ["get", "id"], p.selectedId ?? ""]);
    (m.getSource("route") as mapboxgl.GeoJSONSource | undefined)?.setData(
      p.route ? { type: "Feature", properties: {}, geometry: p.route } : { type: "FeatureCollection", features: [] },
    );
  }

  // filter changes → new data + reframe
  const visibleKey = props.visibleIds.join(",");
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    sync(m);
    fit(m, latest.current);
  }, [visibleKey]);

  // selection → highlight, fly, popup
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    sync(m);
    popup.current?.remove();
    const p = latest.current;
    const poi = p.pois.find((x) => x.id === p.selectedId);
    if (!poi) return;
    m.flyTo({ center: [poi.lng, poi.lat], zoom: Math.max(m.getZoom(), 15), duration: 900, essential: true });
    popup.current = new mapboxgl.Popup({ offset: 24, maxWidth: "260px", closeButton: true, focusAfterOpen: false })
      .setLngLat([poi.lng, poi.lat])
      .setDOMContent(popupNode(poi, p.origin.label))
      .addTo(m);
  }, [props.selectedId]);

  // route geometry → draw and frame
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    sync(m);
    const r = latest.current.route;
    if (!r) return;
    const b = new mapboxgl.LngLatBounds();
    r.coordinates.forEach((c) => b.extend(c as [number, number]));
    m.fitBounds(b, { padding: 64, maxZoom: 16, duration: 900 });
  }, [props.route]);

  return <div ref={box} className="dx-map__canvas" role="region" aria-label="Interaktive Karte des Reiseziels" />;
}
