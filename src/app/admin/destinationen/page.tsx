import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { StatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Destinationen" };

const STATUS: Record<string, { label: string; tone: "ok" | "warn" | "neutral" | "danger" }> = {
  PUBLISHED: { label: "veröffentlicht", tone: "ok" },
  REVIEW: { label: "in Prüfung", tone: "warn" },
  DRAFT: { label: "Entwurf", tone: "neutral" },
  ARCHIVED: { label: "archiviert", tone: "danger" },
};

export default async function DestinationsPage() {
  await requireStaff("cms.read");
  const list = await db.destination.findMany({
    orderBy: { name: "asc" },
    include: { trips: { select: { title: true } }, pois: { select: { review: true, isActive: true, isHighlight: true } } },
  });
  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Destinationen</h1>
          <p>Ortsführer und Karte der Reiseseiten. Öffentlich erscheinen nur aktive, geprüfte Orte.</p>
        </div>
      </header>
      <section className="panel">
        <div className="panel__head">
          <h2>Reiseziele</h2>
          <span className="tabular">{list.length}</span>
        </div>
        {list.length === 0 ? (
          <EmptyState title="Noch keine Destinationen">Mit scripts/migrate/seed-destinations.ts anlegen.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Destination</th>
                  <th scope="col">Status</th>
                  <th scope="col">Orte (öffentlich)</th>
                  <th scope="col">Zu prüfen</th>
                  <th scope="col">Highlights</th>
                  <th scope="col">Reisen</th>
                </tr>
              </thead>
              <tbody>
                {list.map((d) => {
                  const pub = d.pois.filter((p) => p.isActive && p.review === "VERIFIED").length;
                  const open = d.pois.filter((p) => p.review === "DRAFT").length;
                  const s = STATUS[d.status] ?? STATUS.DRAFT!;
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/admin/destinationen/${d.slug}` as never}>{d.name}</Link>
                        {d.region ? <span className="muted"> · {d.region}</span> : null}
                      </td>
                      <td>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      </td>
                      <td className="tabular">
                        {pub} / {d.pois.length}
                      </td>
                      <td>{open ? <StatusPill tone="warn">{open}</StatusPill> : "–"}</td>
                      <td className="tabular">{d.pois.filter((p) => p.isHighlight && p.isActive).length}</td>
                      <td>{d.trips.map((t) => t.title).join(", ") || "–"}</td>
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
