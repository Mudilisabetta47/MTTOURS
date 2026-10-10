import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db/client";
import { DEPARTURE_POINTS } from "@/content/places";
import { formatEur } from "@/lib/money";
import { SplitText } from "@/components/site/split-text";
import { RouteMap } from "@/components/home/route-map";
import "@/styles/trip.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Zustiegsorte Hamburg, Bremen, Hannover – Abfahrtszeiten | METROPOL TOURS" },
  description: "Zustiege für unsere Busreisen: Hamburg ZOB, Bremen ZOB und Hannover ZOB mit Adressen, Steigen, Abfahrtszeiten und Aufpreisen je Reise.",
  alternates: { canonical: "/zustiege" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default async function ZustiegePage() {
  const pickups = await db.tripPickup.findMany({
    where: { trip: { status: "PUBLISHED" } },
    include: { stop: true, trip: { select: { title: true, slug: true, productType: true } } },
    orderBy: [{ trip: { title: "asc" } }],
  });
  return (
    <>
      <header className="page-hero">
        <div className="shell">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Zustiegsorte
          </p>
          <SplitText as="h1" text={"Hamburg. Bremen.\nHannover."} />
          <p data-reveal="up">Welche Zustiege eine Reise hat, mit Uhrzeit, Steig und Aufpreis – direkt aus unseren Reisedaten.</p>
        </div>
      </header>
      <section className="sec shell">
        <div className="zgrid">
          {DEPARTURE_POINTS.map((p) => {
            const list = pickups.filter((x) => x.stop.city.toLowerCase() === p.name.toLowerCase());
            return (
              <article key={p.slug} className="zcard">
                <span className="mono-label">{p.name}</span>
                <h2>{p.stop}</h2>
                <p>{p.address}</p>
                {list.length ? (
                  <ul>
                    {list.map((x) => (
                      <li key={x.id}>
                        <Link href={(x.trip.productType === "TRANSPORT_ONLY" ? `/wochenendtrips/${x.trip.slug}` : `/reisen/${x.trip.slug}`) as never}>{x.trip.title}</Link>
                        <span>
                          {x.localTime ? `${x.localTime} Uhr` : "Zeit beim Termin"}
                          {x.platform ? ` · ${x.platform}` : ""}
                          {x.surchargeCents ? ` · + ${formatEur(x.surchargeCents)}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="tnote">Derzeit keine veröffentlichte Reise mit diesem Zustieg.</p>
                )}
              </article>
            );
          })}
        </div>
        <p className="tnote" style={{ marginBlockStart: "1.5rem" }}>
          Verbindlich sind die Zeiten beim gebuchten Termin und in Ihrer Buchungsbestätigung.
        </p>
      </section>
      <section className="sec on-dark">
        <div className="shell">
          <RouteMap />
        </div>
      </section>
    </>
  );
}
