"use client";

import { useActionState, useState } from "react";
import { submitInquiry, type InquiryState } from "./actions";
import { OCCASIONS, VEHICLE_CLASSES } from "@/content/rental";
import { COMPANY, LEGAL_LINKS } from "@/content/company";

export interface InquiryDefaults {
  anlass?: string;
  start?: string;
  ziel?: string;
  datum?: string;
  personen?: string;
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <span id={`${id}-err`} className="error">
      {msg}
    </span>
  ) : null;
}

export function InquiryForm({ defaults }: { defaults: InquiryDefaults }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry, { status: "idle" });
  const val = (k: string): string | undefined => state.values?.[k] ?? (defaults as Record<string, string | undefined>)[k];
  const [returnTrip, setReturnTrip] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const e = state.errors ?? {};
  const inv = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `${k}-err` } : {});
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "done") {
    return (
      <div className="inq__done" role="status">
        <p className="mono-label">Anfrage gesendet</p>
        <h3>Danke. Ihre Anfrage ist bei uns.</h3>
        {state.number ? (
          <p>
            Ihre Anfragenummer: <strong className="tabular">{state.number}</strong>
          </p>
        ) : null}
        <p>Wir prüfen Strecke und Verfügbarkeit und melden uns mit einem schriftlichen Angebot. Eilt es? Rufen Sie an: <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phoneDisplay}</a>.</p>
      </div>
    );
  }

  return (
    <form action={action} className="inq" noValidate>
      {state.message ? (
        <p className="alert alert--danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="t" value={startedAt} />
      <p className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <fieldset className="inq__group">
        <legend>Die Fahrt</legend>
        <div className="inq__grid">
          <div className="field">
            <label htmlFor="anlass">Art der Fahrt</label>
            <select id="anlass" name="anlass" defaultValue={[...OCCASIONS.map((o) => o.key as string), "sonstiges"].includes(val("anlass") ?? "") ? val("anlass") : "sonstiges"}>
              {OCCASIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
              <option value="sonstiges">Sonstiges</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="personen">Personen *</label>
            <input id="personen" name="personen" type="number" inputMode="numeric" min={1} max={500} required defaultValue={val("personen")} {...inv("personen")} />
            <Err id="personen" msg={e.personen} />
          </div>
          <div className="field">
            <label htmlFor="datum">Datum *</label>
            <input id="datum" name="datum" type="date" min={today} required defaultValue={val("datum")} {...inv("datum")} />
            <Err id="datum" msg={e.datum} />
          </div>
          <div className="field">
            <label htmlFor="uhrzeit">Abfahrt um</label>
            <input id="uhrzeit" name="uhrzeit" type="time" defaultValue={val("uhrzeit")} {...inv("uhrzeit")} />
            <Err id="uhrzeit" msg={e.uhrzeit} />
          </div>
          <div className="field inq__wide">
            <label htmlFor="start">Start (Adresse oder Ort) *</label>
            <input id="start" name="start" required maxLength={200} autoComplete="off" defaultValue={val("start")} {...inv("start")} />
            <Err id="start" msg={e.start} />
          </div>
          <div className="field inq__wide">
            <label htmlFor="ziel">Ziel *</label>
            <input id="ziel" name="ziel" required maxLength={200} autoComplete="off" defaultValue={val("ziel")} {...inv("ziel")} />
            <Err id="ziel" msg={e.ziel} />
          </div>
          <div className="field inq__full">
            <label htmlFor="zwischenstopps">Zwischenstopps</label>
            <textarea id="zwischenstopps" name="zwischenstopps" rows={2} maxLength={1000} placeholder="Optional, z. B. Zustieg am Hauptbahnhof" defaultValue={val("zwischenstopps")} />
          </div>
          <label className="choice inq__full">
            <input type="checkbox" name="rueckfahrt" checked={returnTrip} onChange={(ev) => setReturnTrip(ev.target.checked)} />
            Rückfahrt gewünscht
          </label>
          {returnTrip ? (
            <>
              <div className="field">
                <label htmlFor="rueckDatum">Datum Rückfahrt *</label>
                <input id="rueckDatum" name="rueckDatum" type="date" min={today} defaultValue={val("rueckDatum")} {...inv("rueckDatum")} />
                <Err id="rueckDatum" msg={e.rueckDatum} />
              </div>
              <div className="field">
                <label htmlFor="rueckUhrzeit">Rückfahrt um</label>
                <input id="rueckUhrzeit" name="rueckUhrzeit" type="time" defaultValue={val("rueckUhrzeit")} />
              </div>
            </>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="inq__group">
        <legend>Bus und Gepäck</legend>
        <div className="inq__grid">
          <div className="field">
            <label htmlFor="fahrzeugklasse">Fahrzeug</label>
            <select id="fahrzeugklasse" name="fahrzeugklasse" defaultValue={val("fahrzeugklasse") ?? "egal"}>
              {VEHICLE_CLASSES.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="gepaeck">Gepäck</label>
            <select id="gepaeck" name="gepaeck" defaultValue={val("gepaeck") ?? "handgepaeck"}>
              <option value="keins">Kein nennenswertes Gepäck</option>
              <option value="handgepaeck">Handgepäck</option>
              <option value="koffer">Koffer (Mehrtagesfahrt)</option>
              <option value="sondergepaeck">Sondergepäck (Instrumente, Sportgeräte …)</option>
            </select>
          </div>
          <div className="field inq__full">
            <label htmlFor="anforderungen">Besondere Anforderungen</label>
            <textarea id="anforderungen" name="anforderungen" rows={3} maxLength={2000} placeholder="z. B. Rollstuhlplatz, Kindersitze, Wartezeit vor Ort" defaultValue={val("anforderungen")} />
          </div>
        </div>
      </fieldset>

      <fieldset className="inq__group">
        <legend>Kontakt</legend>
        <div className="inq__grid">
          <div className="field">
            <label htmlFor="name">Name *</label>
            <input id="name" name="name" required maxLength={120} autoComplete="name" defaultValue={val("name")} {...inv("name")} />
            <Err id="name" msg={e.name} />
          </div>
          <div className="field">
            <label htmlFor="firma">Schule, Verein oder Firma</label>
            <input id="firma" name="firma" maxLength={160} autoComplete="organization" defaultValue={val("firma")} />
          </div>
          <div className="field">
            <label htmlFor="email">E-Mail *</label>
            <input id="email" name="email" type="email" required maxLength={254} autoComplete="email" defaultValue={val("email")} {...inv("email")} />
            <Err id="email" msg={e.email} />
          </div>
          <div className="field">
            <label htmlFor="telefon">Telefon</label>
            <input id="telefon" name="telefon" type="tel" maxLength={40} autoComplete="tel" defaultValue={val("telefon")} {...inv("telefon")} />
            <Err id="telefon" msg={e.telefon} />
          </div>
        </div>
      </fieldset>

      <div className="field">
        <label className="choice" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" name="datenschutz" required defaultChecked={val("datenschutz") === "on"} style={{ marginBlockStart: "0.2rem" }} {...inv("datenschutz")} />
          <span>
            Ich bin einverstanden, dass METROPOL TOURS meine Angaben zur Bearbeitung der Anfrage verwendet. Details in der{" "}
            <a href={LEGAL_LINKS.privacy}>Datenschutzerklärung</a>. *
          </span>
        </label>
        <Err id="datenschutz" msg={e.datenschutz} />
      </div>

      <div className="inq__submit">
        <button className="btn btn--brand btn--lg" type="submit" disabled={pending} data-magnetic="0.2">
          {pending ? "Wird gesendet …" : "Angebot anfordern"}
        </button>
        <span className="hint">Unverbindlich. Sie erhalten ein schriftliches Angebot.</span>
      </div>
    </form>
  );
}
