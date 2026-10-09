import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { can, canGrantRole, ROLES, type RoleName } from "@/lib/rbac";
import { formatDateTime } from "@/lib/time";
import { StatusPill } from "@/components/admin/status-pill";
import { EmptyState } from "@/components/admin/empty-state";
import { CreateStaffForm } from "./create-form";
import { ROLE_LABELS } from "@/lib/role-labels";
import { changeRoleAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mitarbeiter" };

const STAFF_ROLES = ROLES.filter((r) => r !== "CUSTOMER");

export default async function StaffPage() {
  const actor = await requireStaff("staff.read");
  const users = await db.user.findMany({
    where: { roles: { some: { role: { in: [...STAFF_ROLES] } } } },
    include: { roles: true },
    orderBy: { displayName: "asc" },
  });
  const mayWrite = can(actor.roles, "staff.write");
  const mayGrant = can(actor.roles, "role.grant");
  const grantable = STAFF_ROLES.filter((r) => canGrantRole(actor.roles, r));

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Mitarbeiter</h1>
          <p>Konten mit Zugang zu Verwaltung, Disposition oder Fahrer-App. Jede Rollenänderung wird protokolliert.</p>
        </div>
      </header>

      {mayWrite ? (
        <section className="panel">
          <div className="panel__head">
            <h2>Neues Konto</h2>
          </div>
          <CreateStaffForm grantable={grantable} />
        </section>
      ) : null}

      <section className="panel">
        <div className="panel__head">
          <h2>Konten</h2>
          <span className="tabular">{users.length}</span>
        </div>
        {users.length === 0 ? (
          <EmptyState title="Noch keine Konten" />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">E-Mail</th>
                  <th scope="col">Status</th>
                  <th scope="col">Rollen</th>
                  <th scope="col">Letzte Anmeldung</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const has = new Set(u.roles.map((r) => r.role as RoleName));
                  return (
                    <tr key={u.id}>
                      <td>{u.displayName}</td>
                      <td>{u.email}</td>
                      <td>
                        {!u.isActive ? (
                          <StatusPill tone="danger">gesperrt</StatusPill>
                        ) : u.passwordHash ? (
                          <StatusPill tone="ok">aktiv</StatusPill>
                        ) : (
                          <StatusPill tone="warn">Passwort ausstehend</StatusPill>
                        )}
                      </td>
                      <td className="roles-cell">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                          {STAFF_ROLES.map((role) => {
                            const active = has.has(role);
                            const editable = mayGrant && canGrantRole(actor.roles, role);
                            if (!editable) return active ? <StatusPill key={role}>{ROLE_LABELS[role]}</StatusPill> : null;
                            return (
                              <form key={role} action={changeRoleAction}>
                                <input type="hidden" name="userId" value={u.id} />
                                <input type="hidden" name="role" value={role} />
                                <input type="hidden" name="op" value={active ? "revoke" : "grant"} />
                                <button
                                  type="submit"
                                  className={active ? "btn btn--sm btn--brand" : "btn btn--sm btn--ghost"}
                                  aria-pressed={active}
                                  title={active ? `${ROLE_LABELS[role]} entziehen` : `${ROLE_LABELS[role]} vergeben`}
                                >
                                  {ROLE_LABELS[role]}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </td>
                      <td className="tabular">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "–"}</td>
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
