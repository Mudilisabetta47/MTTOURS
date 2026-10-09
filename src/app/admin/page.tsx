import { requireStaff } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getDashboardMetrics } from "@/server/dashboard";
import { can } from "@/lib/rbac";
import { formatEur } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint ? <span className="kpi__hint">{hint}</span> : null}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireStaff("dashboard.view");
  const now = new Date();
  const m = await getDashboardMetrics(db, now);
  const showFinance = can(user.roles, "payment.read");

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>Stand {formatDateTime(now)} · alle Werte aus der Plattform-Datenbank</p>
        </div>
      </header>

      <section className="kpis" aria-label="Kennzahlen">
        <Kpi label="Neue Buchungen" value={String(m.newBookings7d)} hint="bestätigt, letzte 7 Tage" />
        <Kpi label="Neue Anfragen" value={String(m.newInquiries7d)} hint="letzte 7 Tage" />
        <Kpi label="Offene Angebote" value={String(m.openQuotes)} hint="versendet, ohne Antwort" />
        <Kpi label="Fahrten heute" value={String(m.runsToday)} />
        <Kpi label="Fahrten morgen" value={String(m.runsTomorrow)} />
        <Kpi label="Fahrzeuge im Einsatz" value={`${m.vehiclesOnRunNow} / ${m.vehiclesActive}`} hint="bestätigt eingeplant / aktiv" />
        {showFinance ? (
          <>
            <Kpi label="Offene Zahlungen" value={String(m.ordersAwaitingPayment)} hint="Bestellungen ohne Zahlungseingang" />
            <Kpi label="Umsatz 30 Tage" value={formatEur(m.revenue30dCents)} hint="erfolgreiche Zahlungen abzgl. Erstattungen" />
          </>
        ) : null}
        <Kpi
          label="Auslastung 30 Tage"
          value={m.utilisation30d ? `${Math.round((m.utilisation30d.sold / m.utilisation30d.capacity) * 100)} %` : "–"}
          hint={
            m.utilisation30d
              ? `${m.utilisation30d.sold} von ${m.utilisation30d.capacity} Plätzen`
              : "keine Abfahrt im Verkauf"
          }
        />
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2>Datenstand</h2>
        </div>
        <div className="empty">
          <strong>Die Plattform befindet sich im Aufbau (Phase 1).</strong>
          <span>
            Reisen, Buchungen und Fahrzeuge werden in den folgenden Phasen angelegt bzw. aus dem Altsystem migriert.
            Bis dahin zeigen die Kennzahlen bewusst 0 statt Beispielwerte.
          </span>
        </div>
      </section>
    </>
  );
}
