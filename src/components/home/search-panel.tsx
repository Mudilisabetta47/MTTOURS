"use client";

import { useState } from "react";
import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";

/** Two clearly separated entry points. Plain GET forms: work without JavaScript, too. */
export function SearchPanel() {
  const [tab, setTab] = useState<"reise" | "bus">("reise");
  return (
    <section id="suche" className="search shell" aria-label="Reise suchen oder Bus mieten">
      <div className="search__card" data-reveal="up">
        <div className="search__tabs" role="tablist" aria-label="Was möchten Sie tun?">
          <button type="button" role="tab" id="tab-reise" aria-controls="panel-reise" aria-selected={tab === "reise"} className="search__tab" onClick={() => setTab("reise")}>
            Reise finden
          </button>
          <button type="button" role="tab" id="tab-bus" aria-controls="panel-bus" aria-selected={tab === "bus"} className="search__tab" onClick={() => setTab("bus")}>
            Bus mieten
          </button>
        </div>

        <form id="panel-reise" role="tabpanel" aria-labelledby="tab-reise" hidden={tab !== "reise"} className="search__form" action="/reisen" method="get">
          <div className="field">
            <label htmlFor="s-ziel">Reiseziel</label>
            <select id="s-ziel" name="ziel" defaultValue="">
              <option value="">Alle Ziele</option>
              {DESTINATIONS.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-ab">Abfahrtsort</label>
            <select id="s-ab" name="ab" defaultValue="">
              <option value="">Alle Abfahrtsorte</option>
              {DEPARTURE_POINTS.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="s-monat">Zeitraum ab</label>
            <input id="s-monat" name="monat" type="month" />
          </div>
          <div className="field">
            <label htmlFor="s-pers">Reisende</label>
            <input id="s-pers" name="personen" type="number" min={1} max={60} defaultValue={2} inputMode="numeric" />
          </div>
          <button className="btn btn--brand" type="submit" data-magnetic="0.2">
            Reisen anzeigen
          </button>
        </form>

        <form id="panel-bus" role="tabpanel" aria-labelledby="tab-bus" hidden={tab !== "bus"} className="search__form search__form--rent" action="/bus-mieten#anfrage" method="get">
          <div className="field">
            <label htmlFor="r-start">Start</label>
            <input id="r-start" name="start" placeholder="z. B. Schule in Hannover" autoComplete="off" maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="r-ziel">Ziel</label>
            <input id="r-ziel" name="ziel" placeholder="z. B. Harz" autoComplete="off" maxLength={200} />
          </div>
          <div className="field">
            <label htmlFor="r-datum">Datum</label>
            <input id="r-datum" name="datum" type="date" />
          </div>
          <div className="field">
            <label htmlFor="r-pers">Personen</label>
            <input id="r-pers" name="personen" type="number" min={1} max={500} inputMode="numeric" placeholder="z. B. 45" />
          </div>
          <button className="btn btn--brand" type="submit" data-magnetic="0.2">
            Weiter zur Anfrage
          </button>
        </form>
        <p className="search__note">
          {tab === "reise"
            ? "Es werden nur freigegebene Termine mit freien Plätzen angezeigt."
            : "Sie erhalten ein schriftliches Angebot inklusive Fahrer. Die Anfrage ist unverbindlich."}
        </p>
      </div>
    </section>
  );
}
