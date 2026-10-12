import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { can } from "@/lib/rbac";
import { formatEur } from "@/lib/money";
import { BUSINESS_TZ, formatDateTime } from "@/lib/time";
import { StatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";
import { tripPath, type FareConditions } from "@/server/catalog/trips";
import { blocksToText } from "@/server/trips/admin";
import { TRIP_STATUS, TYPE_LABEL } from "../labels";
import {
  capacityAction,
  createDepartureAction,
  departureStatusAction,
  fareAction,
  mediaAction,
  removePickupAction,
  saveBasicsAction,
  saveHotelAction,
  saveInclusionsAction,
  saveItineraryAction,
  savePickupAction,
  saveSeoAction,
  saveServiceAction,
  setCertificateAction,
  setStatusAction,
} from "../actions";

export const dynamic = "force-dynamic";

const TABS = [
  ["grunddaten", "Grunddaten"],
  ["termine", "Termine & Preise"],
  ["zustiege", "Zustiege"],
  ["leistungen", "Leistungen"],
  ["reiseverlauf", "Reiseverlauf"],
  ["unterkunft", "Unterkunft"],
  ["bilder", "Bilder"],
  ["veroeffentlichung", "SEO & Veröffentlichung"],
] as const;
type Tab = (typeof TABS)[number][0];

const DEP_STATUS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" | "danger" | "info" }> = {
  DRAFT: { label: "Entwurf", tone: "neutral" },
  ON_SALE: { label: "im Verkauf", tone: "ok" },
  SALES_CLOSED: { label: "Verkauf beendet", tone: "info" },
  CANCELLED: { label: "abgesagt", tone: "danger" },
  COMPLETED: { label: "durchgeführt", tone: "neutral" },
};
const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });
const euro = (c: number) => (c / 100).toFixed(2).replace(".", ",");

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; ok?: string; fehler?: string }> };

export async function generateMetadata({ params }: Props) {
  const t = await db.trip.findUnique({ where: { id: (await params).id }, select: { title: true } });
  return { title: t?.title ?? "Reise" };
}

export default async function TripEditor({ params, searchParams }: Props) {
  const actor = await requireStaff("trip.read");
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = TABS.some(([k]) => k === sp.tab) ? (sp.tab as Tab) : "grunddaten";
  const t = await db.trip.findUnique({
    where: { id },
    include: {
      inclusions: { orderBy: [{ kind: "asc" }, { sort: "asc" }] },
      itinerary: { orderBy: { dayNumber: "asc" } },
      pickups: { orderBy: { sort: "asc" }, include: { stop: true } },
      optionalServices: { orderBy: { sort: "asc" } },
      media: { orderBy: [{ role: "desc" }, { sort: "asc" }], include: { media: { include: { file: true } } } },
      departures: {
        orderBy: { departAt: "desc" },
        take: 40,
        include: { fares: { orderBy: { sort: "asc" } }, stops: { orderBy: { sequence: "asc" }, include: { stop: true } }, _count: { select: { bookings: true } } },
      },
    },
  });
  if (!t) notFound();
  const write = can(actor.roles, "trip.write");
  const publish = can(actor.roles, "trip.publish");
  const prices = can(actor.roles, "price.write");
  const s = TRIP_STATUS[t.status] ?? TRIP_STATUS.DRAFT!;
  const hidden = { tripId: t.id };

  return (
    <>
      <header className="adm-head">
        <div>
          <p className="muted">
            <Link href={"/admin/reisen" as never}>Reisen</Link> / {TYPE_LABEL[t.productType]}
          </p>
          <h1>{t.title}</h1>
          <p>
            <StatusPill tone={s.tone}>{s.label}</StatusPill> {t.destination} · {t.durationDays} Tage ·{" "}
            {t.status === "PUBLISHED" ? (
              <a href={tripPath(t)} target="_blank" rel="noreferrer">
                Seite ansehen ↗
              </a>
            ) : (
              <span className="muted">noch nicht öffentlich</span>
            )}
          </p>
        </div>
      </header>

      {sp.ok ? (
        <p className="alert alert--ok" role="status">
          {sp.ok}
        </p>
      ) : null}
      {sp.fehler ? (
        <p className="alert alert--danger" role="alert">
          {sp.fehler}
        </p>
      ) : null}
      {t.reviewNotes.length ? (
        <section className="alert alert--warn">
          <strong>Offene Punkte aus der Datenübernahme</strong>
          <ul className="adm-list">
            {t.reviewNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className="adm-tabs" aria-label="Bereiche der Reise">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/reisen/${t.id}?tab=${k}` as never} aria-current={tab === k ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>

      {tab === "grunddaten" ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Grunddaten</h2>
          </div>
          <form action={saveBasicsAction} className="adm-form">
            <Hidden v={hidden} />
            <F label="Titel *" name="title" value={t.title} max={120} disabled={!write} />
            <F label="Reiseziel *" name="destination" value={t.destination} max={80} disabled={!write} />
            <F label="Land (ISO) *" name="countryCode" value={t.countryCode} max={2} disabled={!write} />
            <F label="Kategorie" name="category" value={t.category ?? ""} max={60} disabled={!write} hint="z. B. Strandurlaub, Städtereise" />
            <F label="Dauer (Tage) *" name="durationDays" value={String(t.durationDays)} type="number" disabled={!write} />
            <F label="Nächte" name="durationNights" value={String(t.durationNights)} type="number" disabled={!write} />
            <F label="Kurzbeschreibung *" name="summary" value={t.summary} max={300} wide disabled={!write} hint="Erscheint in Reiselisten und als Einleitung (20–300 Zeichen)." />
            <F label="Schwerpunkte" name="highlights" value={t.highlights.join(", ")} max={400} wide disabled={!write} hint="Kommagetrennt, z. B. Promenade des Anglais, Altstadt" />
            <div className="field adm-wide">
              <label htmlFor="f-desc">Beschreibung</label>
              <textarea id="f-desc" name="description" rows={12} defaultValue={blocksToText(t.description)} disabled={!write} />
              <span className="hint">Absätze mit Leerzeile trennen. „## “ für Zwischenüberschriften, „- “ für Aufzählungen.</span>
            </div>
            {write ? <Submit>Grunddaten speichern</Submit> : null}
          </form>
        </section>
      ) : null}

      {tab === "termine" ? (
        <>
          <section className="panel">
            <div className="panel__head">
              <h2>Termine</h2>
              <span className="tabular">{t.departures.length}</span>
            </div>
            {t.departures.length === 0 ? (
              <EmptyState title="Noch keine Termine">Legen Sie unten den ersten Termin an.</EmptyState>
            ) : (
              <div className="adm-deps">
                {t.departures.map((d) => {
                  const st = DEP_STATUS[d.status] ?? DEP_STATUS.DRAFT!;
                  const past = d.departAt <= new Date();
                  return (
                    <article key={d.id} className="adm-dep" data-past={past ? "true" : "false"}>
                      <header>
                        <div>
                          <strong>{formatDateTime(d.departAt)}</strong>
                          {d.returnAt ? <span className="muted"> → {formatDateTime(d.returnAt)}</span> : null}
                          <br />
                          <span className="muted tabular">{d.code}</span>
                        </div>
                        <div className="adm-dep__meta">
                          <StatusPill tone={st.tone}>{st.label}</StatusPill>
                          <span className="tabular">
                            {d.soldCount} verkauft · {d.heldCount} reserviert · {d.capacity} Plätze · {d._count.bookings} Buchungen
                          </span>
                        </div>
                      </header>
                      <p className="muted">
                        Zustiege:{" "}
                        {d.stops.map((x) => `${x.stop.city} ${tFmt.format(x.plannedAt)}${x.surchargeCents ? ` (+${formatEur(x.surchargeCents)})` : ""}`).join(" · ") || "–"}
                      </p>
                      <div className="table-wrap">
                        <table className="data">
                          <thead>
                            <tr>
                              <th scope="col">Tarif</th>
                              <th scope="col">Preis p. P.</th>
                              <th scope="col">Leistungen (je Zeile)</th>
                              <th scope="col">Empfohlen</th>
                              <th scope="col">Aktiv</th>
                              <th scope="col" />
                            </tr>
                          </thead>
                          <tbody>
                            {d.fares.map((f) => {
                              const c = (f.conditions ?? {}) as FareConditions;
                              const formId = `fare-${f.id}`;
                              return (
                                <tr key={f.id}>
                                  <td>
                                    <input form={formId} name="name" defaultValue={f.name} maxLength={40} disabled={!prices || past} aria-label="Tarifname" />
                                    <br />
                                    <span className="muted">{f.code}</span>
                                  </td>
                                  <td>
                                    <input form={formId} name="price" defaultValue={euro(f.priceCents)} inputMode="decimal" size={8} disabled={!prices || past} aria-label="Preis" />
                                  </td>
                                  <td>
                                    <textarea form={formId} name="features" rows={3} defaultValue={(c.features ?? []).join("\n")} disabled={!prices || past} aria-label="Leistungen des Tarifs" />
                                  </td>
                                  <td>
                                    <input form={formId} type="checkbox" name="recommended" defaultChecked={!!c.recommended} disabled={!prices || past} aria-label="Empfohlen" />
                                  </td>
                                  <td>
                                    <input form={formId} type="checkbox" name="isActive" defaultChecked={f.isActive} disabled={!prices || past} aria-label="Aktiv" />
                                  </td>
                                  <td>
                                    {prices && !past ? (
                                      <form id={formId} action={fareAction}>
                                        <Hidden v={{ ...hidden, fareId: f.id }} />
                                        <button className="btn btn--sm" type="submit">
                                          Speichern
                                        </button>
                                      </form>
                                    ) : null}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {!past ? (
                        <footer className="adm-dep__actions">
                          {write ? (
                            <form action={capacityAction} className="adm-inline">
                              <Hidden v={{ ...hidden, departureId: d.id }} />
                              <label>
                                Plätze <input name="capacity" type="number" min={1} max={90} defaultValue={d.capacity} />
                              </label>
                              <button className="btn btn--sm" type="submit">
                                Ändern
                              </button>
                            </form>
                          ) : null}
                          {publish ? (
                            <form action={departureStatusAction} className="adm-inline">
                              <Hidden v={{ ...hidden, departureId: d.id }} />
                              {d.status !== "ON_SALE" && d.status !== "CANCELLED" ? (
                                <button className="btn btn--sm btn--brand" name="status" value="ON_SALE">
                                  Verkauf starten
                                </button>
                              ) : null}
                              {d.status === "ON_SALE" ? (
                                <button className="btn btn--sm" name="status" value="SALES_CLOSED">
                                  Verkauf beenden
                                </button>
                              ) : null}
                              {d.status === "DRAFT" ? null : d.status !== "CANCELLED" ? (
                                <button className="btn btn--sm adm-danger" name="status" value="CANCELLED">
                                  Termin absagen
                                </button>
                              ) : null}
                            </form>
                          ) : null}
                        </footer>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {prices ? (
            <section className="panel">
              <div className="panel__head">
                <h2>Neuen Termin anlegen</h2>
              </div>
              {t.pickups.length === 0 ? (
                <p className="alert alert--warn">Bitte zuerst im Reiter „Zustiege“ die Zustiege mit Uhrzeit anlegen – sie werden für jeden Termin übernommen.</p>
              ) : (
                <form action={createDepartureAction} className="adm-form">
                  <Hidden v={hidden} />
                  <F label="Abfahrtsdatum *" name="date" type="date" />
                  <F label="Rückkehr (Datum)" name="returnDate" type="date" />
                  <F label="Rückkehr (Uhrzeit, ca.)" name="returnTime" type="time" />
                  <F label="Plätze *" name="capacity" type="number" value="50" />
                  <p className="muted adm-wide">
                    Abfahrtszeiten aus den Zustiegen: {t.pickups.map((p) => `${p.stop.city} ${p.localTime ?? "?"}`).join(" · ")}
                  </p>
                  <div className="adm-wide adm-fares">
                    {(t.departures[0]?.fares.length ? t.departures[0].fares.map((f) => ({ code: f.code, name: f.name, price: euro(f.priceCents), features: ((f.conditions ?? {}) as FareConditions).features?.join("\n") ?? "" })) : [
                      { code: "BASIC", name: "Basic", price: "", features: "" },
                      { code: "SMART", name: "Smart", price: "", features: "" },
                      { code: "FLEX", name: "Flex", price: "", features: "" },
                    ]).map((f, i) => (
                      <fieldset key={i} className="adm-fare">
                        <legend>Tarif {i + 1}</legend>
                        <input type="hidden" name="fareCode" value={f.code} />
                        <label>
                          Name <input name="fareName" defaultValue={f.name} maxLength={40} />
                        </label>
                        <label>
                          Preis p. P. (€) <input name="farePrice" defaultValue={f.price} inputMode="decimal" placeholder="leer = nicht anbieten" />
                        </label>
                        <label>
                          Leistungen (je Zeile) <textarea name="fareFeatures" rows={3} defaultValue={f.features} />
                        </label>
                        <label className="choice">
                          <input type="radio" name="recommended" value={f.code} defaultChecked={i === 1} /> empfohlen
                        </label>
                      </fieldset>
                    ))}
                  </div>
                  <Submit>Termin als Entwurf anlegen</Submit>
                </form>
              )}
            </section>
          ) : null}
        </>
      ) : null}

      {tab === "zustiege" ? <PickupsTab t={t} write={write} hidden={hidden} /> : null}

      {tab === "leistungen" ? (
        <>
          <section className="panel">
            <div className="panel__head">
              <h2>Im Preis enthalten / nicht enthalten</h2>
            </div>
            <form action={saveInclusionsAction} className="adm-form">
              <Hidden v={hidden} />
              <div className="field">
                <label htmlFor="f-inc">Enthalten (je Zeile)</label>
                <textarea id="f-inc" name="included" rows={10} defaultValue={t.inclusions.filter((i) => i.kind === "INCLUDED").map((i) => i.text).join("\n")} disabled={!write} />
              </div>
              <div className="field">
                <label htmlFor="f-exc">Nicht enthalten (je Zeile)</label>
                <textarea id="f-exc" name="excluded" rows={10} defaultValue={t.inclusions.filter((i) => i.kind === "EXCLUDED").map((i) => i.text).join("\n")} disabled={!write} />
              </div>
              <p className="muted adm-wide">Nur Leistungen eintragen, die vertraglich gesichert sind – sie erscheinen 1:1 auf der Reiseseite.</p>
              {write ? <Submit>Leistungen speichern</Submit> : null}
            </form>
          </section>
          <section className="panel">
            <div className="panel__head">
              <h2>Zusatzleistungen (zubuchbar)</h2>
            </div>
            {[...t.optionalServices.map((o) => ({ ...o, price: euro(o.priceCents) })), { id: "", name: "", description: "", price: "", unit: "PER_PERSON" as const, maxPerBooking: null, isActive: true }].map((o) => (
              <form key={o.id || "new"} action={saveServiceAction} className="adm-form adm-form--row">
                <Hidden v={{ ...hidden, id: o.id }} />
                <F label={o.id ? "Name" : "Neue Zusatzleistung"} name="name" value={o.name} max={100} disabled={!write} />
                <F label="Beschreibung" name="description" value={o.description ?? ""} max={240} disabled={!write} />
                <F label="Preis (€)" name="price" value={o.price} disabled={!write} />
                <div className="field">
                  <label>Einheit</label>
                  <select name="unit" defaultValue={o.unit} disabled={!write}>
                    <option value="PER_PERSON">pro Person</option>
                    <option value="PER_BOOKING">pro Buchung</option>
                  </select>
                </div>
                <label className="choice">
                  <input type="checkbox" name="isActive" defaultChecked={o.isActive} disabled={!write} /> aktiv
                </label>
                {write ? <Submit small>{o.id ? "Speichern" : "Hinzufügen"}</Submit> : null}
              </form>
            ))}
          </section>
        </>
      ) : null}

      {tab === "reiseverlauf" ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Reiseverlauf (Tag für Tag)</h2>
          </div>
          <form action={saveItineraryAction} className="adm-form">
            <Hidden v={hidden} />
            {Array.from({ length: Math.max(t.durationDays, t.itinerary.length) }, (_, i) => t.itinerary[i] ?? { dayNumber: i + 1, title: "", body: "" }).map((d, i) => (
              <fieldset key={i} className="adm-day adm-wide">
                <legend>Tag {i + 1}</legend>
                <input name="dayTitle" defaultValue={d.title} maxLength={120} placeholder="Titel, z. B. Anreise nach Nizza" disabled={!write} aria-label={`Tag ${i + 1} Titel`} />
                <textarea name="dayBody" rows={3} defaultValue={d.body} placeholder="Was passiert an diesem Tag?" disabled={!write} aria-label={`Tag ${i + 1} Beschreibung`} />
              </fieldset>
            ))}
            <p className="muted adm-wide">Tage ohne Titel werden nicht angezeigt. Bitte nur zugesagte Programmpunkte eintragen.</p>
            {write ? <Submit>Reiseverlauf speichern</Submit> : null}
          </form>
        </section>
      ) : null}

      {tab === "unterkunft" ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Unterkunft</h2>
          </div>
          <form action={saveHotelAction} className="adm-form">
            <Hidden v={hidden} />
            <F label="Hotelname" name="hotelName" value={t.hotelName ?? ""} max={120} disabled={!write} />
            <F label="Sterne (1–5)" name="hotelStars" value={t.hotelStars ? String(t.hotelStars) : ""} type="number" disabled={!write} />
            <F label="Adresse" name="hotelAddress" value={t.hotelAddress ?? ""} max={200} wide disabled={!write} />
            <F label="Breite (für Entfernungen)" name="latitude" value={t.latitude != null ? String(t.latitude) : ""} disabled={!write} />
            <F label="Länge" name="longitude" value={t.longitude != null ? String(t.longitude) : ""} disabled={!write} />
            <p className="muted adm-wide">Mit Koordinaten misst der Ortsführer die Entfernungen ab dem Hotel statt ab dem Stadtzentrum.</p>
            {write ? <Submit>Unterkunft speichern</Submit> : null}
          </form>
        </section>
      ) : null}

      {tab === "bilder" ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Bilder</h2>
            <span className="tabular">{t.media.length}</span>
          </div>
          {t.media.length === 0 ? (
            <EmptyState title="Keine Bilder">Das Hochladen eigener Fotos folgt mit dem Medienspeicher.</EmptyState>
          ) : (
            <div className="adm-media">
              {t.media.map((m) => (
                <form key={m.mediaId} action={mediaAction} className="adm-media__item">
                  <Hidden v={{ ...hidden, mediaId: m.mediaId }} />
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a local file */}
                  <img src={`/media/${m.media.file.key}`} alt="" width={m.media.width} height={m.media.height} loading="lazy" />
                  <div className="adm-media__body">
                    {m.role === "HERO" ? <StatusPill tone="info">Hauptbild</StatusPill> : null}{" "}
                    {m.media.rightsConfirmed ? <StatusPill tone="ok">Rechte bestätigt</StatusPill> : <StatusPill tone="warn">Rechte offen – live unsichtbar</StatusPill>}
                    <span className="muted">{m.media.credit}</span>
                    <label>
                      Bildbeschreibung (Alt-Text)
                      <input name="alt" defaultValue={m.media.alt} maxLength={200} disabled={!write} />
                    </label>
                    <label className="choice">
                      <input type="checkbox" name="hero" defaultChecked={m.role === "HERO"} disabled={!write} /> Hauptbild
                    </label>
                    <label className="choice">
                      <input type="checkbox" name="rightsConfirmed" defaultChecked={m.media.rightsConfirmed} disabled={!publish} /> Nutzungsrechte liegen vor
                    </label>
                    <label className="choice">
                      <input type="checkbox" name="visible" defaultChecked disabled={!write} /> an der Reise anzeigen
                    </label>
                    {write ? <Submit small>Speichern</Submit> : null}
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "veroeffentlichung" ? (
        <>
          <section className="panel">
            <div className="panel__head">
              <h2>Status</h2>
              <StatusPill tone={s.tone}>{s.label}</StatusPill>
            </div>
            {publish ? (
              <form action={setStatusAction} className="adm-form adm-form--row">
                <Hidden v={hidden} />
                <button className="btn btn--sm" name="status" value="DRAFT">
                  Entwurf
                </button>
                <button className="btn btn--sm" name="status" value="REVIEW">
                  Zur Prüfung
                </button>
                <button className="btn btn--sm btn--brand" name="status" value="PUBLISHED">
                  Veröffentlichen
                </button>
                <button className="btn btn--sm adm-danger" name="status" value="ARCHIVED">
                  Archivieren
                </button>
              </form>
            ) : (
              <p className="muted">Veröffentlichen dürfen Inhaber und Administratoren.</p>
            )}
          </section>
          {t.productType === "PACKAGE_TOUR" ? (
            <section className="panel">
              <div className="panel__head">
                <h2>Sicherungsschein (§ 651r BGB)</h2>
                {t.insolvencyCertificateRef ? <StatusPill tone="ok">hinterlegt</StatusPill> : <StatusPill tone="warn">fehlt – Online-Buchung gesperrt</StatusPill>}
              </div>
              <form action={setCertificateAction} className="adm-form adm-form--row">
                <Hidden v={hidden} />
                <F label="Versicherer / Nummer des Sicherungsscheins" name="ref" value={t.insolvencyCertificateRef ?? ""} max={120} disabled={!publish} />
                {publish ? <Submit small>Speichern</Submit> : null}
              </form>
              <p className="muted" style={{ padding: "0 1rem 1rem" }}>
                Ohne Sicherungsschein zeigt die Seite „Online-Buchung in Kürze“ und sammelt Vormerkungen.
              </p>
            </section>
          ) : null}
          <SeoPanel t={t} hidden={hidden} write={can(actor.roles, "seo.write")} />
        </>
      ) : null}
    </>
  );
}

/* ── small helpers ─────────────────────────────────────────────────── */

function Hidden({ v }: { v: Record<string, string> }) {
  return (
    <>
      {Object.entries(v).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
    </>
  );
}

function F({ label, name, value, type = "text", max, wide, hint, disabled }: { label: string; name: string; value?: string; type?: string; max?: number; wide?: boolean; hint?: string; disabled?: boolean }) {
  const id = `f-${name}`;
  return (
    <div className={wide ? "field adm-wide" : "field"}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type={type} defaultValue={value} maxLength={max} disabled={disabled} />
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

function Submit({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <button className={small ? "btn btn--brand btn--sm" : "btn btn--brand"} type="submit">
      {children}
    </button>
  );
}

async function PickupsTab({ t, write, hidden }: { t: { id: string; pickups: { stopId: string; localTime: string | null; platform: string | null; surchargeCents: number; stop: { name: string; city: string; street: string | null } }[] }; write: boolean; hidden: Record<string, string> }) {
  const stops = await db.stop.findMany({ where: { isActive: true }, orderBy: [{ city: "asc" }, { name: "asc" }] });
  const free = stops.filter((s) => !t.pickups.some((p) => p.stopId === s.id));
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>Zustiege mit Abfahrtszeit</h2>
        <span className="tabular">{t.pickups.length}</span>
      </div>
      <p className="muted" style={{ padding: "0 1rem" }}>
        Diese Zeiten sind die Vorlage für neue Termine und erscheinen ohne Termin als „Richtzeiten“ auf der Website.
      </p>
      {t.pickups.map((p) => (
        <div key={p.stopId} className="adm-form adm-form--row">
          <form action={savePickupAction} className="adm-form adm-form--row" style={{ padding: 0 }}>
            <Hidden v={{ ...hidden, stopId: p.stopId }} />
            <div className="field">
              <label>Zustieg</label>
              <strong>{p.stop.name}</strong>
              <span className="hint">{p.stop.street ?? p.stop.city}</span>
            </div>
            <F label="Abfahrt (HH:MM)" name="localTime" value={p.localTime ?? ""} type="time" disabled={!write} />
            <F label="Steig / Treffpunkt" name="platform" value={p.platform ?? ""} max={60} disabled={!write} />
            <F label="Aufpreis p. P. (€)" name="surcharge" value={euro(p.surchargeCents)} disabled={!write} />
            {write ? <Submit small>Speichern</Submit> : null}
          </form>
          {write ? (
            <form action={removePickupAction}>
              <Hidden v={{ ...hidden, stopId: p.stopId }} />
              <button className="btn btn--sm adm-danger" type="submit">
                Entfernen
              </button>
            </form>
          ) : null}
        </div>
      ))}
      {write && free.length ? (
        <form action={savePickupAction} className="adm-form adm-form--row">
          <Hidden v={hidden} />
          <div className="field">
            <label htmlFor="np-stop">Zustieg hinzufügen</label>
            <select id="np-stop" name="stopId" required>
              {free.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <F label="Abfahrt (HH:MM)" name="localTime" type="time" />
          <F label="Steig / Treffpunkt" name="platform" max={60} />
          <F label="Aufpreis p. P. (€)" name="surcharge" value="0,00" />
          <Submit small>Hinzufügen</Submit>
        </form>
      ) : null}
    </section>
  );
}

async function SeoPanel({ t, hidden, write }: { t: { seoTitle: string | null; seoDescription: string | null; noindex: boolean; guideId: string | null; title: string; summary: string }; hidden: Record<string, string>; write: boolean }) {
  const guides = await db.destination.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <section className="panel">
      <div className="panel__head">
        <h2>SEO & Ortsführer</h2>
      </div>
      <form action={saveSeoAction} className="adm-form">
        <Hidden v={hidden} />
        <F label={`SEO-Titel (leer = „${t.title}“)`} name="seoTitle" value={t.seoTitle ?? ""} max={70} wide disabled={!write} />
        <F label="SEO-Beschreibung (leer = Kurzbeschreibung)" name="seoDescription" value={t.seoDescription ?? ""} max={170} wide disabled={!write} />
        <div className="field">
          <label htmlFor="f-guide">Ortsführer (Umgebung)</label>
          <select id="f-guide" name="guideId" defaultValue={t.guideId ?? ""} disabled={!write}>
            <option value="">keiner</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <label className="choice">
          <input type="checkbox" name="noindex" defaultChecked={t.noindex} disabled={!write} /> nicht in Suchmaschinen anzeigen
        </label>
        {write ? <Submit>SEO speichern</Submit> : null}
      </form>
    </section>
  );
}
