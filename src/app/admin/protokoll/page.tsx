import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { formatDateTime } from "@/lib/time";
import { EmptyState } from "@/components/admin/empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Protokoll" };

const PAGE_SIZE = 100;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string }> }) {
  await requireStaff("audit.read");
  const { action, entity } = await searchParams;
  const where = {
    ...(action ? { action: { startsWith: action.slice(0, 80) } } : {}),
    ...(entity ? { entityId: entity.slice(0, 80) } : {}),
  };
  const rows = await db.auditLog.findMany({
    where,
    orderBy: { at: "desc" },
    take: PAGE_SIZE,
    include: { actor: { select: { displayName: true } } },
  });

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Protokoll</h1>
          <p>Unveränderliches Änderungsprotokoll (append-only, datenbankseitig geschützt). Neueste {PAGE_SIZE} Einträge.</p>
        </div>
      </header>
      <section className="panel">
        <form className="filters" method="get">
          <div className="field">
            <label htmlFor="action">Aktion beginnt mit</label>
            <input id="action" name="action" defaultValue={action ?? ""} placeholder="z. B. auth. oder user.role" />
          </div>
          <div className="field">
            <label htmlFor="entity">Objekt-ID</label>
            <input id="entity" name="entity" defaultValue={entity ?? ""} />
          </div>
          <button className="btn btn--sm btn--ghost" type="submit">
            Filtern
          </button>
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Keine Einträge" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Zeit</th>
                  <th scope="col">Akteur</th>
                  <th scope="col">Aktion</th>
                  <th scope="col">Objekt</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular">{formatDateTime(r.at)}</td>
                    <td>{r.actor?.displayName ?? r.actorLabel ?? "–"}</td>
                    <td>
                      <code>{r.action}</code>
                    </td>
                    <td>
                      {r.entityType} <code>{r.entityId.slice(0, 14)}</code>
                    </td>
                    <td style={{ whiteSpace: "normal", maxInlineSize: "38ch" }}>
                      <code style={{ fontSize: "var(--step--2)" }}>
                        {r.after ? JSON.stringify(r.after).slice(0, 160) : r.before ? JSON.stringify(r.before).slice(0, 160) : ""}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
