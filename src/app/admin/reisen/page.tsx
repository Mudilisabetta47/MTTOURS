import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { can } from "@/lib/rbac";
import { formatDate } from "@/lib/time";
import { StatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";
import { tripPath } from "@/server/catalog/trips";
import { TRIP_STATUS, TYPE_LABEL } from "./labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reisen" };

export default async function TripsAdminPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const actor = await requireStaff("trip.read");
  const { typ } = await searchParams;
  const now = new Date();
  const trips = await db.trip.findMany({
    where: typ && TYPE_LABEL[typ] ? { productType: typ as "PACKAGE_TOUR" } : {},
    orderBy: [{ status: "asc" }, { title: "asc" }],
    include: {
      departures: { where: { departAt: { gt: now } }, orderBy: { departAt: "asc" }, select: { departAt: true, status: true, capacity: true, soldCount: true } },
      media: { include: { media: { select: { rightsConfirmed: true } } } },
      _count: { select: { pickups: true, itinerary: true } },
    },
  });
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Reisen</h1>
          <p>Pauschalreisen und Wochenendtrips: Inhalte, Termine, Preise, Zustiege und Veröffentlichung.</p>
        </div>
        {can(actor.roles, "trip.write") ? (
          <Link className="btn btn--brand" href={"/admin/reisen/neu" as never}>
            Neue Reise
          </Link>
        ) : null}
      </header>

      <nav className="adm-tabs" aria-label="Reiseart">
        {[["", "Alle"], ["PACKAGE_TOUR", "Pauschalreisen"], ["TRANSPORT_ONLY", "Wochenendtrips"]].map(([v, l]) => (
          <Link key={v} href={(v ? `/admin/reisen?typ=${v}` : "/admin/reisen") as never} aria-current={(typ ?? "") === v ? "page" : undefined}>
            {l}
          </Link>
        ))}
      </nav>

      <section className="panel">
        <div className="panel__head">
          <h2>Übersicht</h2>
          <span className="tabular">{trips.length}</span>
        </div>
        {trips.length === 0 ? (
          <EmptyState title="Noch keine Reisen" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Reise</th>
                  <th scope="col">Status</th>
                  <th scope="col">Nächster Termin</th>
                  <th scope="col">Termine im Verkauf</th>
                  <th scope="col">Belegung</th>
                  <th scope="col">Inhalte</th>
                  <th scope="col">Offene Punkte</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const s = TRIP_STATUS[t.status] ?? TRIP_STATUS.DRAFT!;
                  const onSale = t.departures.filter((d) => d.status === "ON_SALE");
                  const cap = t.departures.reduce((a, d) => a + d.capacity, 0);
                  const sold = t.departures.reduce((a, d) => a + d.soldCount, 0);
                  const unconfirmed = t.media.filter((m) => !m.media.rightsConfirmed).length;
                  const locked = t.productType === "PACKAGE_TOUR" && !t.insolvencyCertificateRef;
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/admin/reisen/${t.id}` as never}>
                          <strong>{t.title}</strong>
                        </Link>
                        <br />
                        <span className="muted">
                          {TYPE_LABEL[t.productType]} · {t.destination} · {t.durationDays} Tage
                        </span>
                      </td>
                      <td>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                        {locked ? (
                          <>
                            {" "}
                            <StatusPill tone="warn">ohne Sicherungsschein</StatusPill>
                          </>
                        ) : null}
                      </td>
                      <td className="tabular">{t.departures[0] ? formatDate(t.departures[0].departAt) : "–"}</td>
                      <td className="tabular">{onSale.length || "–"}</td>
                      <td className="tabular">{cap ? `${sold} / ${cap}` : "–"}</td>
                      <td className="muted">
                        {t.media.length} Bilder{unconfirmed ? ` (${unconfirmed} Rechte offen)` : ""} · {t._count.pickups} Zustiege · {t._count.itinerary} Tage Verlauf
                      </td>
                      <td>
                        {t.reviewNotes.length ? <StatusPill tone="warn">{t.reviewNotes.length}</StatusPill> : "–"}
                        {t.status === "PUBLISHED" ? (
                          <>
                            {" "}
                            <a href={tripPath(t)} target="_blank" rel="noreferrer" className="muted">
                              ansehen ↗
                            </a>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
