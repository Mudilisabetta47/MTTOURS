import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db/client";
import { requirePermission } from "@/server/auth/session";
import { formatDateTime, BUSINESS_TZ } from "@/lib/time";
import { endRunAction, startRunAction } from "../../actions";
import { Tracker } from "./tracker";
import "@/styles/driver.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fahrt", robots: { index: false, follow: false } };

const tFmt = new Intl.DateTimeFormat("de-DE", { timeZone: BUSINESS_TZ, hour: "2-digit", minute: "2-digit" });
const STATUS: Record<string, string> = { PLANNED: "geplant", CONFIRMED: "bestätigt", DISPATCHED: "disponiert", IN_PROGRESS: "unterwegs", COMPLETED: "beendet", CANCELLED: "abgesagt" };

export default async function DriverRunPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const user = await requirePermission("driverapp.use");
  const { id } = await params;
  const { fehler } = await searchParams;
  const driver = await db.driver.findUnique({ where: { userId: user.id }, select: { id: true } });
  const run = driver
    ? await db.run.findFirst({
        where: { id, drivers: { some: { driverId: driver.id, status: { not: "CANCELLED" } } } },
        include: {
          vehicles: { where: { status: { not: "CANCELLED" } }, include: { vehicle: true } },
          departure: { include: { stops: { orderBy: { sequence: "asc" }, include: { stop: true, boardingPassengers: { select: { id: true } } } } } },
        },
      })
    : null;
  if (!run) notFound();
  const v = run.vehicles[0]?.vehicle;

  return (
    <main className="drv shell">
      <p>
        <Link href={"/fahrer" as never}>← Meine Fahrten</Link>
      </p>
      <header className="drv-head">
        <span className={`drv-pill drv-pill--${run.status.toLowerCase()}`}>{STATUS[run.status]}</span>
        <h1>{run.title}</h1>
        <p>
          {run.number} · {formatDateTime(run.startsAt)} · {v ? `${v.licensePlate} (${v.internalNumber})` : "kein Fahrzeug"}
        </p>
      </header>
      {fehler ? (
        <p className="alert alert--danger" role="alert">
          {fehler}
        </p>
      ) : null}

      {run.status === "IN_PROGRESS" ? <Tracker runId={run.id} /> : null}

      {run.departure?.stops.length ? (
        <section className="drv-card">
          <h2>Zustiege</h2>
          <ol className="drv-stops">
            {run.departure.stops.map((s) => (
              <li key={s.id}>
                <span className="tabular">{tFmt.format(s.plannedAt)}</span>
                <div>
                  <strong>{s.stop.name}</strong>
                  <span>
                    {[s.stop.street, s.stop.city].filter(Boolean).join(", ")}
                    {s.platform ? ` · ${s.platform}` : ""}
                  </span>
                </div>
                <span className="drv-stops__pax">{s.boardingPassengers.length} Fahrgäste</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="drv-actions">
        {run.status === "IN_PROGRESS" ? (
          <form action={endRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <button className="btn btn--lg drv-end" type="submit">
              Fahrt beenden
            </button>
          </form>
        ) : run.status === "COMPLETED" || run.status === "CANCELLED" ? (
          <p className="alert alert--info">Diese Fahrt ist {STATUS[run.status]}.</p>
        ) : (
          <form action={startRunAction}>
            <input type="hidden" name="runId" value={run.id} />
            <button className="btn btn--brand btn--lg" type="submit">
              Fahrt starten und Standort teilen
            </button>
            <p className="drv-note">Mit dem Start teilt Ihr Telefon den Standort des Busses mit der Leitstelle und den gebuchten Fahrgästen – nur bis „Fahrt beenden“.</p>
          </form>
        )}
      </section>
    </main>
  );
}
