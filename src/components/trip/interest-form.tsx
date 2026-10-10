"use client";

import { useActionState, useState } from "react";
import { submitTripInterest, type InterestState } from "./interest-actions";
import { LEGAL_LINKS } from "@/content/company";

export function TripInterestForm({ tripSlug, tripTitle }: { tripSlug: string; tripTitle: string }) {
  const [state, action, pending] = useActionState<InterestState, FormData>(submitTripInterest, { status: "idle" });
  const [startedAt] = useState(() => Date.now());
  const e = state.errors ?? {};
  const v = (k: string) => state.values?.[k];
  const inv = (k: string) => (e[k] ? { "aria-invalid": true as const, "aria-describedby": `ti-${k}-err` } : {});
  const err = (k: string) => (e[k] ? <span id={`ti-${k}-err`} className="error">{e[k]}</span> : null);

  if (state.status === "done") {
    return (
      <div className="inq__done" role="status">
        <p className="mono-label">Vorgemerkt</p>
        <h3>Danke, wir melden uns.</h3>
        {state.number ? (
          <p>
            Ihre Anfragenummer: <strong className="tabular">{state.number}</strong>
          </p>
        ) : null}
        <p>Sobald neue Termine für „{tripTitle}“ feststehen, erhalten Sie Termine und Preise per E-Mail.</p>
      </div>
    );
  }

  return (
    <form action={action} className="inq inq--compact" noValidate>
      {state.message ? (
        <p className="alert alert--danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <input type="hidden" name="t" value={startedAt} />
      <input type="hidden" name="tripSlug" value={tripSlug} />
      <p className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <div className="inq__grid">
        <div className="field">
          <label htmlFor="ti-name">Name *</label>
          <input id="ti-name" name="name" autoComplete="name" required maxLength={120} defaultValue={v("name")} {...inv("name")} />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor="ti-email">E-Mail *</label>
          <input id="ti-email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v("email")} {...inv("email")} />
          {err("email")}
        </div>
        <div className="field">
          <label htmlFor="ti-personen">Reisende *</label>
          <input id="ti-personen" name="personen" type="number" min={1} max={200} inputMode="numeric" required defaultValue={v("personen") ?? "2"} {...inv("personen")} />
          {err("personen")}
        </div>
        <div className="field">
          <label htmlFor="ti-zeitraum">Wunschzeitraum</label>
          <input id="ti-zeitraum" name="zeitraum" maxLength={120} placeholder="z. B. Sommerferien 2027" defaultValue={v("zeitraum")} />
        </div>
        <div className="field">
          <label htmlFor="ti-telefon">Telefon</label>
          <input id="ti-telefon" name="telefon" type="tel" autoComplete="tel" maxLength={40} defaultValue={v("telefon")} {...inv("telefon")} />
          {err("telefon")}
        </div>
        <div className="field">
          <label htmlFor="ti-nachricht">Nachricht</label>
          <input id="ti-nachricht" name="nachricht" maxLength={1500} placeholder="Optional" defaultValue={v("nachricht")} />
        </div>
      </div>
      <label className="choice" style={{ alignItems: "flex-start" }}>
        <input type="checkbox" name="datenschutz" required defaultChecked={v("datenschutz") === "on"} style={{ marginBlockStart: "0.2rem" }} {...inv("datenschutz")} />
        <span>
          Ich bin einverstanden, dass METROPOL TOURS meine Angaben verwendet, um mich zu dieser Reise zu informieren.{" "}
          <a href={LEGAL_LINKS.privacy}>Datenschutz</a> *
        </span>
      </label>
      {err("datenschutz")}
      <div className="inq__submit">
        <button className="btn btn--brand btn--arrow" type="submit" disabled={pending}>
          {pending ? "Wird gesendet …" : "Termin-Info anfordern"}
        </button>
        <span className="hint">Unverbindlich. Keine Buchung.</span>
      </div>
    </form>
  );
}
