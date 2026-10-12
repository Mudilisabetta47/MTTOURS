import Link from "next/link";
import { requireStaff } from "@/server/auth/session";
import { createTripAction } from "../actions";

export const metadata = { title: "Neue Reise" };

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  await requireStaff("trip.write");
  const { fehler } = await searchParams;
  return (
    <>
      <header className="adm-head">
        <div>
          <p className="muted">
            <Link href={"/admin/reisen" as never}>Reisen</Link> /
          </p>
          <h1>Neue Reise</h1>
          <p>Die Reise startet als Entwurf. Inhalte, Zustiege und Termine ergänzen Sie danach.</p>
        </div>
      </header>
      {fehler ? (
        <p className="alert alert--danger" role="alert">
          {fehler}
        </p>
      ) : null}
      <section className="panel">
        <form action={createTripAction} className="filters">
          <div className="field">
            <label htmlFor="n-title">Titel *</label>
            <input id="n-title" name="title" required maxLength={120} placeholder="z. B. Nizza – 7 Tage Côte d’Azur" />
          </div>
          <div className="field">
            <label htmlFor="n-slug">Adresse (URL) *</label>
            <input id="n-slug" name="slug" required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="z. B. nizza" />
          </div>
          <div className="field">
            <label htmlFor="n-type">Reiseart *</label>
            <select id="n-type" name="productType" defaultValue="PACKAGE_TOUR">
              <option value="PACKAGE_TOUR">Pauschalreise</option>
              <option value="TRANSPORT_ONLY">Wochenendtrip (nur Fahrt)</option>
              <option value="DAY_TRIP">Tagesfahrt</option>
              <option value="GROUP_TOUR">Gruppenreise</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="n-dest">Reiseziel *</label>
            <input id="n-dest" name="destination" required maxLength={80} placeholder="z. B. Nizza" />
          </div>
          <div className="field">
            <label htmlFor="n-cc">Land (ISO) *</label>
            <input id="n-cc" name="countryCode" required maxLength={2} placeholder="FR" />
          </div>
          <div className="field">
            <label htmlFor="n-days">Dauer (Tage) *</label>
            <input id="n-days" name="durationDays" type="number" min={1} max={30} defaultValue={7} required />
          </div>
          <button className="btn btn--brand" type="submit">
            Reise anlegen
          </button>
        </form>
      </section>
    </>
  );
}
