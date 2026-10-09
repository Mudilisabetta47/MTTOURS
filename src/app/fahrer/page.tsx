import type { Metadata } from "next";
import { db } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";
import { formatDateTime } from "@/lib/time";
import { logoutAction } from "@/app/anmelden/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fahrer", robots: { index: false, follow: false } };

/**
 * Driver home. Phase 1: shows the driver's own confirmed/tentative assignments (server-side filtered by user).
 * Run details, stops, ticket scanning and offline mode follow in phase 6.
 */
export default async function DriverHome() {
  const user = await requirePermission("driverapp.use");
  const driver = await db.driver.findUnique({ where: { userId: user.id }, select: { id: true, firstName: true } });
  const assignments = driver
    ? await db.driverAssignment.findMany({
        where: { driverId: driver.id, status: { not: "CANCELLED" }, endsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 20,
        include: { run: { select: { number: true, title: true, originText: true, destinationText: true } } },
      })
    : [];

  return (
    <main className="shell" style={{ paddingBlock: "2rem 4rem", display: "grid", gap: "1.25rem", maxInlineSize: 640 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        <div>
          <p className="mono-label">Fahrer</p>
          <h1 style={{ fontSize: "var(--step-3)" }}>Hallo {driver?.firstName ?? user.displayName}</h1>
        </div>
        <form action={logoutAction}>
          <button className="btn btn--ghost btn--sm" type="submit">
            Abmelden
          </button>
        </form>
      </header>
      {!driver ? (
        <p className="alert alert--warn">Ihr Konto ist noch keinem Fahrerprofil zugeordnet. Bitte an die Disposition wenden.</p>
      ) : assignments.length === 0 ? (
        <p className="alert alert--info">Keine kommenden Fahrten eingeplant.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
          {assignments.map((a) => (
            <li key={a.id} style={{ padding: "1rem", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
              <strong>{a.run.title}</strong>
              <div style={{ color: "var(--fg-muted)", fontSize: "var(--step--1)" }}>
                {a.run.number} · {formatDateTime(a.startsAt)} · {a.run.originText} → {a.run.destinationText}
                {a.status === "TENTATIVE" ? " · vorläufig" : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
