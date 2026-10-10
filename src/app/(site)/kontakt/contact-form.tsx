"use client";

import { useActionState, useState } from "react";
import { submitContact, type ContactState } from "./actions";
import { LEGAL_LINKS } from "@/content/company";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  const [t] = useState(() => Date.now());
  const v = (k: string) => state.values?.[k];
  if (state.status === "done") {
    return (
      <div className="inq__done" role="status">
        <p className="mono-label">Gesendet</p>
        <h3>Danke für Ihre Nachricht.</h3>
        {state.number ? <p>Ihre Vorgangsnummer: <strong className="tabular">{state.number}</strong></p> : null}
        <p>Wir melden uns so bald wie möglich.</p>
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
      <input type="hidden" name="t" value={t} />
      <p className="hp" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <div className="inq__grid">
        <div className="field">
          <label htmlFor="k-name">Name *</label>
          <input id="k-name" name="name" autoComplete="name" required maxLength={120} defaultValue={v("name")} />
        </div>
        <div className="field">
          <label htmlFor="k-email">E-Mail *</label>
          <input id="k-email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={v("email")} />
        </div>
        <div className="field">
          <label htmlFor="k-tel">Telefon</label>
          <input id="k-tel" name="telefon" type="tel" autoComplete="tel" maxLength={40} defaultValue={v("telefon")} />
        </div>
        <div className="field">
          <label htmlFor="k-thema">Thema</label>
          <select id="k-thema" name="thema" defaultValue={v("thema") ?? "Reise"}>
            <option>Reise</option>
            <option>Busmiete</option>
            <option>Buchung</option>
            <option>Sonstiges</option>
          </select>
        </div>
        <div className="field inq__full">
          <label htmlFor="k-msg">Nachricht *</label>
          <textarea id="k-msg" name="nachricht" rows={5} required maxLength={3000} defaultValue={v("nachricht")} />
        </div>
      </div>
      <label className="choice" style={{ alignItems: "flex-start" }}>
        <input type="checkbox" name="datenschutz" required style={{ marginBlockStart: "0.2rem" }} />
        <span>
          Ich bin einverstanden, dass METROPOL TOURS meine Angaben zur Bearbeitung verwendet. <a href={LEGAL_LINKS.privacy}>Datenschutz</a> *
        </span>
      </label>
      <div className="inq__submit">
        <button className="btn btn--brand btn--arrow" type="submit" disabled={pending}>
          {pending ? "Wird gesendet …" : "Nachricht senden"}
        </button>
      </div>
    </form>
  );
}
