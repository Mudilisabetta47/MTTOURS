import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { formatEur } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { StatusPill, type Tone } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buchungen" };

const STATUS: Record<string, { label: string; tone: Tone }> = {
  CONFIRMED: { label: "bestätigt", tone: "ok" },
  PENDING: { label: "Zahlung offen", tone: "warn" },
  CANCELLED: { label: "storniert", tone: "danger" },
};

/** Read-only list of website bookings, newest first. Detail views and actions follow with the back office. */
export default async function BookingsPage() {
  await requireStaff("booking.read");
  const bookings = await db.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      order: { select: { number: true, status: true, totalCents: true } },
      departure: { select: { code: true, departAt: true, trip: { select: { title: true } } } },
      fare: { select: { name: true } },
      _count: { select: { passengers: true } },
    },
  });
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Buchungen</h1>
          <p>Online-Buchungen der Website. Bestätigt wird eine Buchung ausschließlich durch die verifizierte Zahlung.</p>
        </div>
      </header>
      <section className="panel">
        <div className="panel__head">
          <h2>Neueste Buchungen</h2>
          <span className="tabular">{bookings.length}</span>
        </div>
        {bookings.length === 0 ? (
          <EmptyState title="Noch keine Buchungen" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Buchung</th>
                  <th scope="col">Status</th>
                  <th scope="col">Reise</th>
                  <th scope="col">Abfahrt</th>
                  <th scope="col">Tarif</th>
                  <th scope="col">Reisende</th>
                  <th scope="col">Betrag</th>
                  <th scope="col">Kontakt</th>
                  <th scope="col">Erstellt</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const s = STATUS[b.status] ?? { label: b.status.toLowerCase(), tone: "neutral" as Tone };
                  return (
                    <tr key={b.id}>
                      <td className="tabular">
                        {b.number}
                        <br />
                        <span className="muted">{b.order.number}</span>
                      </td>
                      <td>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      </td>
                      <td>{b.departure.trip.title}</td>
                      <td className="tabular">
                        {formatDateTime(b.departure.departAt)}
                        <br />
                        <span className="muted">{b.departure.code}</span>
                      </td>
                      <td>{b.fare?.name ?? "–"}</td>
                      <td className="tabular">{b._count.passengers}</td>
                      <td className="tabular">{formatEur(b.order.totalCents)}</td>
                      <td>
                        {b.contactName}
                        <br />
                        <span className="muted">{b.contactEmail}</span>
                      </td>
                      <td className="tabular">{formatDateTime(b.createdAt)}</td>
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
