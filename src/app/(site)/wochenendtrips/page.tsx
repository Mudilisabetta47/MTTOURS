import type { Metadata } from "next";
import { db } from "@/server/db/client";
import { listPublishedTrips } from "@/server/catalog/trips";
import { TripResult } from "@/components/trip/trip-result";
import { SplitText } from "@/components/site/split-text";
import { KiImage } from "@/components/site/ki-image";
import "@/styles/trip.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Wochenendtrips mit dem Bus ab Hamburg, Bremen und Hannover | METROPOL TOURS" },
  description: "Wochenendtrips im Reisebus nach Amsterdam, Kopenhagen, Prag und Paris. Sie buchen die Fahrt, die Unterkunft optional.",
  alternates: { canonical: "/wochenendtrips" },
  robots: process.env.APP_ENV === "production" ? undefined : { index: false, follow: false },
};

export default async function WeekendTripsPage() {
  const trips = await listPublishedTrips(db, { productType: "TRANSPORT_ONLY" });
  return (
    <>
      <header className="phero phero--photo">
        <KiImage src="/media/ki/slider-wochenendtrips.jpg" alt="Altstadtgasse am Abend mit Cafés und Kirchturm" priority className="phero__photo" />
        <div className="phero__shade" aria-hidden="true" />
        <div className="shell phero__inner">
          <p className="mono-label" style={{ color: "var(--brand)" }}>
            Wochenendtrips
          </p>
          <SplitText as="h1" text={"Freitag los.\nSonntag zurück."} className="phero__title" />
          <p className="phero__lead" data-reveal="up">
            Städte für ein Wochenende, bequem im Reisebus. Sie buchen die Fahrt – eine Unterkunft können Sie optional dazunehmen.
          </p>
        </div>
      </header>
      <section className="sec shell" aria-labelledby="w-trips">
        <div className="sec-head">
          <p className="mono-label">Ziele</p>
          <SplitText as="h2" id="w-trips" text="Vier Städte, ein Wochenende." />
        </div>
        <div className="tresults">
          {trips.map((t) => (
            <TripResult key={t.slug} t={t} />
          ))}
        </div>
      </section>
    </>
  );
}
