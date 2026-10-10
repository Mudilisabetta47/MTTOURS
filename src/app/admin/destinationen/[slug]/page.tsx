import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { can } from "@/lib/rbac";
import { crowMeters, type Guide } from "@/server/catalog/destinations";
import { StatusPill } from "@/components/admin/status-pill";
import { CATEGORY, CATEGORY_ORDER, formatDistance } from "@/components/destination/categories";
import { DestinationExplorer } from "@/components/destination/explorer";
import { addPoiAction, assignTripsAction, reviewPoiAction, saveDestinationAction, savePoiAction } from "../actions";
import "@/styles/destination.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; fehler?: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `Destination ${slug}` };
}

const REVIEW = { VERIFIED: { label: "geprüft", tone: "ok" }, DRAFT: { label: "zu prüfen", tone: "warn" }, REJECTED: { label: "abgelehnt", tone: "danger" } } as const;

export default async function DestinationDetail({ params, searchParams }: Props) {
  const actor = await requireStaff("cms.read");
  const { slug } = await params;
  const { ok, fehler } = await searchParams;
  const d = await db.destination.findUnique({
    where: { slug: slug.slice(0, 120) },
    include: { pois: { orderBy: [{ category: "asc" }, { sort: "asc" }] }, trips: { select: { id: true } } },
  });
  if (!d) notFound();
  const trips = await db.trip.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true, status: true, guideId: true } });
  const write = can(actor.roles, "cms.write");
  const ref = { lat: d.refLatitude, lng: d.refLongitude };
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk.") ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : null;

  // preview exactly what the public page will show
  const preview: Guide = {
    slug: d.slug,
    name: d.name,
    city: d.city,
    region: d.region,
    intro: d.intro,
    center: { lat: d.latitude, lng: d.longitude, zoom: d.defaultZoom },
    origin: { label: d.refLabel, lat: d.refLatitude, lng: d.refLongitude, kind: "reference" },
    pois: d.pois
      .filter((p) => p.isActive && p.review === "VERIFIED")
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        description: p.description,
        lat: p.latitude,
        lng: p.longitude,
        crowMeters: crowMeters(ref, { lat: p.latitude, lng: p.longitude }),
        isHighlight: p.isHighlight,
        highlightText: p.highlightText,
        attribution: p.attribution,
        photo: null,
      })),
    attributions: [...new Set(d.pois.map((p) => p.attribution).filter((x): x is string => !!x))],
  };

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="muted">
            <Link href={"/admin/destinationen" as never}>Destinationen</Link> /
          </p>
          <h1>{d.name}</h1>
          <p>
            {d.city}, {d.countryCode}
            {d.region ? ` · ${d.region}` : ""} · Bezugspunkt für Entfernungen: {d.refLabel}
          </p>
        </div>
      </header>

      {ok ? (
        <p className="alert alert--ok" role="status">
          {ok}
        </p>
      ) : null}
      {fehler ? (
        <p className="alert alert--danger" role="alert">
          {fehler}
        </p>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Übersicht, Koordinaten &amp; SEO</h2>
          <StatusPill tone={d.status === "PUBLISHED" ? "ok" : "neutral"}>{d.status === "PUBLISHED" ? "veröffentlicht" : d.status.toLowerCase()}</StatusPill>
        </div>
        <form action={saveDestinationAction} className="filters">
          <input type="hidden" name="id" value={d.id} />
          <input type="hidden" name="slug" value={d.slug} />
          <div className="field">
            <label htmlFor="d-name">Name</label>
            <input id="d-name" name="name" defaultValue={d.name} required maxLength={80} disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-region">Region</label>
            <input id="d-region" name="region" defaultValue={d.region ?? ""} maxLength={80} disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-status">Status</label>
            <select id="d-status" name="status" defaultValue={d.status} disabled={!write}>
              <option value="DRAFT">Entwurf</option>
              <option value="REVIEW">in Prüfung</option>
              <option value="PUBLISHED">veröffentlicht</option>
              <option value="ARCHIVED">archiviert</option>
            </select>
          </div>
          <fieldset className="field">
            <label htmlFor="d-intro">Einleitung</label>
            <input id="d-intro" name="intro" defaultValue={d.intro ?? ""} maxLength={300} disabled={!write} />
          </fieldset>
          <div className="field">
            <label htmlFor="d-ref">Bezugspunkt (Bezeichnung)</label>
            <input id="d-ref" name="refLabel" defaultValue={d.refLabel} required maxLength={120} disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-rlat">Breite</label>
            <input id="d-rlat" name="refLatitude" defaultValue={d.refLatitude} inputMode="decimal" required disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-rlng">Länge</label>
            <input id="d-rlng" name="refLongitude" defaultValue={d.refLongitude} inputMode="decimal" required disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-zoom">Start-Zoom</label>
            <input id="d-zoom" name="defaultZoom" defaultValue={d.defaultZoom} inputMode="decimal" required disabled={!write} />
          </div>
          <div className="field">
            <label htmlFor="d-seot">SEO-Titel</label>
            <input id="d-seot" name="seoTitle" defaultValue={d.seoTitle ?? ""} maxLength={70} disabled={!write} />
          </div>
          <fieldset className="field">
            <label htmlFor="d-seod">SEO-Beschreibung</label>
            <input id="d-seod" name="seoDescription" defaultValue={d.seoDescription ?? ""} maxLength={170} disabled={!write} />
          </fieldset>
          {write ? (
            <button className="btn btn--brand btn--sm" type="submit">
              Speichern
            </button>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Vorschau (wie auf der Reiseseite)</h2>
          <span className="tabular">{preview.pois.length} öffentlich</span>
        </div>
        <div style={{ padding: "1rem" }}>
          {preview.pois.length ? <DestinationExplorer guide={preview} token={token ?? null} /> : <p className="muted">Noch keine geprüften, aktiven Orte.</p>}
        </div>
      </section>

      {CATEGORY_ORDER.map((c) => {
        const pois = d.pois.filter((p) => p.category === c);
        if (!pois.length) return null;
        return (
          <section key={c} className="panel">
            <div className="panel__head">
              <h2>{CATEGORY[c].label}</h2>
              <span className="tabular">{pois.length}</span>
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th scope="col">Ort</th>
                    <th scope="col">Prüfung</th>
                    <th scope="col">Luftlinie</th>
                    <th scope="col">Quelle</th>
                    <th scope="col">Bearbeiten</th>
                  </tr>
                </thead>
                <tbody>
                  {pois.map((p) => {
                    const r = REVIEW[p.review];
                    return (
                      <tr key={p.id} style={p.isActive ? undefined : { opacity: 0.55 }}>
                        <td>
                          <strong>{p.name}</strong>
                          {p.isHighlight ? <StatusPill tone="info">Highlight</StatusPill> : null}
                          {!p.isActive ? <StatusPill>ausgeblendet</StatusPill> : null}
                          <br />
                          <span className="muted">{p.address ?? `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`}</span>
                        </td>
                        <td>
                          <StatusPill tone={r.tone}>{r.label}</StatusPill>
                          {p.verifiedBy ? <span className="muted"> {p.verifiedBy}</span> : null}
                          {write && p.review !== "VERIFIED" ? (
                            <form action={reviewPoiAction} style={{ display: "inline-flex", gap: "0.3rem", marginInlineStart: "0.4rem" }}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="slug" value={d.slug} />
                              <button className="btn btn--sm btn--brand" name="review" value="VERIFIED">
                                Freigeben
                              </button>
                              {p.review === "DRAFT" ? (
                                <button className="btn btn--sm" name="review" value="REJECTED">
                                  Ablehnen
                                </button>
                              ) : null}
                            </form>
                          ) : null}
                        </td>
                        <td className="tabular">{formatDistance(crowMeters(ref, { lat: p.latitude, lng: p.longitude }))}</td>
                        <td>
                          {p.source.startsWith("osm:") ? (
                            <a href={`https://www.openstreetmap.org/${p.source.slice(4)}`} target="_blank" rel="noopener noreferrer">
                              {p.source}
                            </a>
                          ) : (
                            p.source
                          )}
                        </td>
                        <td>
                          <details>
                            <summary>Ändern</summary>
                            <form action={savePoiAction} className="filters" style={{ padding: "0.6rem 0" }}>
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="slug" value={d.slug} />
                              <div className="field">
                                <label>Kategorie</label>
                                <select name="category" defaultValue={p.category} disabled={!write}>
                                  {CATEGORY_ORDER.map((x) => (
                                    <option key={x} value={x}>
                                      {CATEGORY[x].label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <fieldset className="field">
                                <label>Beschreibung</label>
                                <input name="description" defaultValue={p.description ?? ""} maxLength={240} disabled={!write} />
                              </fieldset>
                              <div className="field">
                                <label>Breite</label>
                                <input name="latitude" defaultValue={p.latitude} inputMode="decimal" disabled={!write} />
                              </div>
                              <div className="field">
                                <label>Länge</label>
                                <input name="longitude" defaultValue={p.longitude} inputMode="decimal" disabled={!write} />
                              </div>
                              <div className="field">
                                <label>Sortierung</label>
                                <input name="sort" defaultValue={p.sort} inputMode="numeric" disabled={!write} />
                              </div>
                              <label className="choice">
                                <input type="checkbox" name="isActive" defaultChecked={p.isActive} disabled={!write} /> sichtbar
                              </label>
                              <label className="choice">
                                <input type="checkbox" name="isHighlight" defaultChecked={p.isHighlight} disabled={!write} /> Highlight
                              </label>
                              <fieldset className="field">
                                <label>Highlight-Text</label>
                                <input name="highlightText" defaultValue={p.highlightText ?? ""} maxLength={160} disabled={!write} />
                              </fieldset>
                              {write ? (
                                <button className="btn btn--brand btn--sm" type="submit">
                                  Ort speichern
                                </button>
                              ) : null}
                            </form>
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {write ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Ort hinzufügen</h2>
          </div>
          <form action={addPoiAction} className="filters">
            <input type="hidden" name="destinationId" value={d.id} />
            <input type="hidden" name="slug" value={d.slug} />
            <div className="field">
              <label htmlFor="n-name">Name *</label>
              <input id="n-name" name="name" required maxLength={100} />
            </div>
            <div className="field">
              <label htmlFor="n-q">Suchbegriff (optional)</label>
              <input id="n-q" name="query" maxLength={160} placeholder={`z. B. Name, ${d.city}`} />
            </div>
            <div className="field">
              <label htmlFor="n-cat">Kategorie *</label>
              <select id="n-cat" name="category" defaultValue="SIGHT">
                {CATEGORY_ORDER.map((x) => (
                  <option key={x} value={x}>
                    {CATEGORY[x].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="n-r">Umkreis (km)</label>
              <input id="n-r" name="radiusKm" defaultValue={10} inputMode="numeric" />
            </div>
            <fieldset className="field">
              <label htmlFor="n-desc">Kurzbeschreibung</label>
              <input id="n-desc" name="description" maxLength={240} />
            </fieldset>
            <button className="btn btn--brand btn--sm" type="submit">
              In OpenStreetMap suchen und anlegen
            </button>
            <p className="muted" style={{ flexBasis: "100%", margin: 0 }}>
              Neue Orte werden als „zu prüfen“ angelegt und erscheinen erst nach Freigabe auf der Website.
            </p>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Zugeordnete Reisen</h2>
        </div>
        <form action={assignTripsAction} className="filters">
          <input type="hidden" name="destinationId" value={d.id} />
          <input type="hidden" name="slug" value={d.slug} />
          {trips.map((t) => (
            <label key={t.id} className="choice">
              <input type="checkbox" name="tripIds" value={t.id} defaultChecked={t.guideId === d.id} disabled={!write} /> {t.title}
              {t.guideId && t.guideId !== d.id ? <span className="muted"> (andere Destination)</span> : null}
            </label>
          ))}
          {write ? (
            <button className="btn btn--brand btn--sm" type="submit">
              Zuordnung speichern
            </button>
          ) : null}
        </form>
      </section>
    </>
  );
}
