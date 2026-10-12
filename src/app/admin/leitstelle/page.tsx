import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { can } from "@/lib/rbac";
import { formatDateTime } from "@/lib/time";
import { StatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";
import { activeRuns } from "@/server/live/tracking";
import { createDriverAction, createRunAction, createVehicleAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leitstelle" };

const RUN: Record<string, { label: string; tone: "ok" | "info" | "neutral" | "warn" }> = {
  IN_PROGRESS: { label: "unterwegs", tone: "ok" },
  CONFIRMED: { label: "bestätigt", tone: "info" },
  DISPATCHED: { label: "disponiert", tone: "info" },
  PLANNED: { label: "geplant", tone: "neutral" },
};

function ago(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  return s < 90 ? `vor ${s} s` : s < 5400 ? `vor ${Math.round(s / 60)} Min.` : `vor ${Math.round(s / 3600)} Std.`;
}

export default async function ControlRoom({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  const actor = await requireStaff("ops.view");
  const { ok, fehler } = await searchParams;
  const runs = await activeRuns(db);
  const [departures, vehicles, drivers, driverUsers] = await Promise.all([
    db.tripDeparture.findMany({
      where: { departAt: { gt: new Date() }, status: { in: ["ON_SALE", "SALES_CLOSED"] }, run: null },
      orderBy: { departAt: "asc" },
      take: 50,
      include: { trip: { select: { title: true } } },
    }),
    db.vehicle.findMany({ where: { status: "ACTIVE" }, orderBy: { internalNumber: "asc" } }),
    db.driver.findMany({ orderBy: { lastName: "asc" } }),
    db.user.findMany({ where: { roles: { some: { role: "DRIVER" } }, driver: null, isActive: true }, select: { id: true, displayName: true, email: true } }),
  ]);
  const live = runs.filter((r) => r.status === "IN_PROGRESS");

  return (
    <>
      {/* the control room refreshes itself; positions arrive every 15 s */}
      <meta httpEquiv="refresh" content="30" />
      <header className="adm-head">
        <div>
          <h1>Leitstelle</h1>
          <p>Laufende und kommende Fahrten mit Live-Standort aus der Fahrer-App. Aktualisiert sich alle 30 Sekunden.</p>
        </div>
        <StatusPill tone={live.length ? "ok" : "neutral"}>{live.length} unterwegs</StatusPill>
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
          <h2>Fahrten (laufend und nächste 7 Tage)</h2>
          <span className="tabular">{runs.length}</span>
        </div>
        {runs.length === 0 ? (
          <EmptyState title="Keine Fahrten">Legen Sie unten für einen Termin eine Fahrt mit Bus und Fahrer an.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Fahrt</th>
                  <th scope="col">Status</th>
                  <th scope="col">Fahrzeug</th>
                  <th scope="col">Fahrer</th>
                  <th scope="col">Letzter Standort</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const s = RUN[r.status] ?? RUN.PLANNED!;
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.title}</strong>
                        <br />
                        <span className="muted tabular">
                          {r.number} · {formatDateTime(r.startsAt)}
                          {r.departure ? ` · ${r.departure.soldCount} Fahrgäste` : ""}
                        </span>
                      </td>
                      <td>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      </td>
                      <td>{r.vehicles.map((v) => `${v.vehicle.licensePlate} (${v.vehicle.internalNumber})`).join(", ") || "–"}</td>
                      <td>{r.drivers.map((d) => `${d.driver.firstName} ${d.driver.lastName}`).join(", ") || "–"}</td>
                      <td>
                        {r.last ? (
                          <>
                            <StatusPill tone={r.last.stale ? "warn" : "ok"}>{r.last.stale ? "veraltet" : "live"}</StatusPill>{" "}
                            <span className="tabular">{ago(r.last.at)}</span>
                            {r.last.speedKmh != null ? <span className="muted"> · {Math.round(r.last.speedKmh)} km/h</span> : null}
                            {r.last.accuracyM != null ? <span className="muted"> · ±{Math.round(r.last.accuracyM)} m</span> : null}
                            <br />
                            <a href={`https://www.openstreetmap.org/?mlat=${r.last.lat}&mlon=${r.last.lng}#map=13/${r.last.lat}/${r.last.lng}`} target="_blank" rel="noopener noreferrer">
                              Auf Karte ansehen ↗
                            </a>
                          </>
                        ) : r.status === "IN_PROGRESS" ? (
                          <StatusPill tone="warn">noch kein Standort</StatusPill>
                        ) : (
                          <span className="muted">startet {formatDateTime(r.startsAt)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {can(actor.roles, "dispatch.assign") ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Fahrt für einen Termin anlegen</h2>
          </div>
          {departures.length && vehicles.length && drivers.length ? (
            <form action={createRunAction} className="adm-form">
              <div className="field">
                <label htmlFor="r-dep">Termin</label>
                <select id="r-dep" name="departureId" required>
                  {departures.map((d) => (
                    <option key={d.id} value={d.id}>
                      {formatDateTime(d.departAt)} · {d.trip.title} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="r-veh">Fahrzeug</label>
                <select id="r-veh" name="vehicleId" required>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} · {v.manufacturer} {v.model} · {v.seats} Plätze
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="r-drv">Fahrer</label>
                <select id="r-drv" name="driverId" required>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn--brand" type="submit">
                Fahrt anlegen
              </button>
            </form>
          ) : (
            <p className="muted" style={{ padding: "1rem" }}>
              Dafür braucht es einen kommenden Termin im Verkauf, mindestens ein Fahrzeug und ein Fahrerprofil
              {departures.length ? "" : " – aktuell gibt es keinen Termin ohne Fahrt"}.
            </p>
          )}
        </section>
      ) : null}

      <div className="adm-two">
        {can(actor.roles, "vehicle.write") ? (
          <section className="panel">
            <div className="panel__head">
              <h2>Fahrzeug anlegen</h2>
              <span className="tabular">{vehicles.length}</span>
            </div>
            <form action={createVehicleAction} className="adm-form">
              <div className="field">
                <label htmlFor="v-nr">Wagennummer</label>
                <input id="v-nr" name="internalNumber" required maxLength={20} placeholder="z. B. 01" />
              </div>
              <div className="field">
                <label htmlFor="v-pl">Kennzeichen</label>
                <input id="v-pl" name="licensePlate" required maxLength={15} placeholder="H-MT 123" />
              </div>
              <div className="field">
                <label htmlFor="v-man">Hersteller</label>
                <input id="v-man" name="manufacturer" required maxLength={40} placeholder="MAN" />
              </div>
              <div className="field">
                <label htmlFor="v-mod">Modell</label>
                <input id="v-mod" name="model" required maxLength={60} placeholder="Lion’s Coach" />
              </div>
              <div className="field">
                <label htmlFor="v-seats">Sitzplätze</label>
                <input id="v-seats" name="seats" type="number" min={8} max={90} required defaultValue={50} />
              </div>
              <div className="field">
                <label htmlFor="v-class">Klasse</label>
                <select id="v-class" name="vehicleClass" defaultValue="REISEBUS">
                  <option value="KLEINBUS">Kleinbus</option>
                  <option value="MIDIBUS">Midibus</option>
                  <option value="REISEBUS">Reisebus</option>
                  <option value="DOPPELDECKER">Doppeldecker</option>
                </select>
              </div>
              <button className="btn btn--brand btn--sm" type="submit">
                Fahrzeug anlegen
              </button>
            </form>
          </section>
        ) : null}
        {can(actor.roles, "driver.write") ? (
          <section className="panel">
            <div className="panel__head">
              <h2>Fahrerprofil anlegen</h2>
              <span className="tabular">{drivers.length}</span>
            </div>
            {driverUsers.length ? (
              <form action={createDriverAction} className="adm-form">
                <div className="field">
                  <label htmlFor="d-user">Konto mit Rolle „Fahrer“</label>
                  <select id="d-user" name="userId">
                    {driverUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button className="btn btn--brand btn--sm" type="submit">
                  Fahrerprofil anlegen
                </button>
              </form>
            ) : (
              <p className="muted" style={{ padding: "1rem" }}>
                Neue Fahrer legen Sie unter „Benutzer &amp; Rollen“ mit der Rolle „Fahrer“ an – danach erscheinen sie hier.
              </p>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
