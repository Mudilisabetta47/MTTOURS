import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/server/db/client";
import { SplitText } from "@/components/site/split-text";
import "@/styles/trip.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Fuhrpark – unsere Reisebusse | METROPOL TOURS" },
  description: "Der Fuhrpark von METROPOL TOURS: Reisebus MAN Lion’s Coach in limettengrüner Lackierung, Heimat Hannover. Fahrzeugvorschlag passend zu Ihrer Gruppe.",
  alternates: { canonical: "/fuhrpark" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

/** Only verified vehicles: from the Vehicle table once the dispatch has entered the fleet; otherwise the one documented coach. */
export default async function FuhrparkPage() {
  const vehicles = await db.vehicle.findMany({ where: { status: { in: ["ACTIVE", "MAINTENANCE"] } }, orderBy: { internalNumber: "asc" } });
  return (
    <>
      <header className="page-hero page-hero--photo">
        <div className="ki">
          <Image src="/media/metropol-man-lions-coach.jpg" alt="MAN Lion’s Coach von METROPOL TOURS (echtes Foto)" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "62% 55%" }} />
        </div>
        <div className="shell" style={{ display: "grid", gap: "1rem" }}>
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Fuhrpark
          </p>
          <SplitText as="h1" text={"Ein Bus, den man\nwiedererkennt."} className="thero__title" />
        </div>
      </header>
      <section className="sec shell">
        {vehicles.length ? (
          <div className="tgrid">
            {vehicles.map((v) => (
              <article key={v.id} className="zcard">
                <span className="mono-label">{v.vehicleClass}</span>
                <h2>
                  {v.manufacturer} {v.model}
                </h2>
                <p>{v.seats} Sitzplätze</p>
                {v.equipment.length ? <p className="tnote">{v.equipment.join(" · ")}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="split2">
            <dl className="facts">
              <div>
                <dt>Modell</dt>
                <dd>MAN Lion’s Coach</dd>
              </div>
              <div>
                <dt>Bauart</dt>
                <dd>Reisebus, drei Achsen</dd>
              </div>
              <div>
                <dt>Zuhause</dt>
                <dd>Hannover</dd>
              </div>
              <div>
                <dt>Erkennungszeichen</dt>
                <dd>Limettengrüne Lackierung</dd>
              </div>
            </dl>
            <div className="sec-head">
              <p className="mono-label">Für Ihre Fahrt</p>
              <h2>Das passende Fahrzeug zur Gruppe.</h2>
              <p>Nennen Sie uns Personenzahl, Gepäck und Strecke. Mit dem Angebot erhalten Sie den Fahrzeugvorschlag mit Sitzplätzen und Ausstattung.</p>
              <Link className="btn btn--brand btn--arrow" href="/bus-mieten#anfrage" style={{ justifySelf: "start" }}>
                Bus anfragen
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
