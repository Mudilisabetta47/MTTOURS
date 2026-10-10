import type { Metadata } from "next";
import Image from "next/image";
import "@/styles/admin.css";
import { requireStaff } from "@/server/auth/session";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { can } from "@/lib/rbac";
import { NavLink } from "@/components/admin/nav-link";
import { logoutAction } from "@/app/anmelden/actions";
import { ROLE_LABELS } from "@/lib/role-labels";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s · Verwaltung · METROPOL TOURS" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("dashboard.view");
  const groups = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.implemented && can(user.roles, i.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="adm">
      <a className="skip-link" href="#adm-main">
        Zum Inhalt springen
      </a>
      <aside className="adm-side" aria-label="Hauptnavigation">
        <div className="adm-side__brand">
          <Image src="/brand/metropol-logo-light-hd.png" alt="METROPOL TOURS" width={118} height={48} />
        </div>
        <nav>
          {groups.map((g) => (
            <section key={g.label} className="adm-side__group">
              <h2>{g.label}</h2>
              <ul>
                {g.items.map((i) => (
                  <li key={i.href}>
                    <NavLink href={i.href}>{i.label}</NavLink>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
        <div className="adm-side__foot">
          <span className="who">{user.displayName}</span>
          <span className="roles">{user.roles.map((r) => ROLE_LABELS[r]).join(" · ")}</span>
          <form action={logoutAction}>
            <button className="btn btn--sm" type="submit">
              Abmelden
            </button>
          </form>
        </div>
      </aside>
      <main id="adm-main" className="adm-main">
        {children}
      </main>
    </div>
  );
}
