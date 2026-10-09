"use client";

import Link from "next/link";
import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "./actions";

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPasswordAction, {});
  if (state.done) {
    return (
      <div className="alert alert--info" role="status">
        Passwort gespeichert. <Link href="/anmelden">Jetzt anmelden</Link>
      </div>
    );
  }
  return (
    <form action={action} style={{ display: "grid", gap: "1rem" }}>
      {state.error ? (
        <p className="alert alert--danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <input type="hidden" name="token" value={token} />
      <div className="field">
        <label htmlFor="password">Neues Passwort</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
        <span className="hint">Mindestens 12 Zeichen. Ein Satz aus mehreren Wörtern ist sicher und gut zu merken.</span>
      </div>
      <div className="field">
        <label htmlFor="confirm">Passwort wiederholen</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <button className="btn btn--brand" type="submit" disabled={pending}>
        Passwort speichern
      </button>
    </form>
  );
}
