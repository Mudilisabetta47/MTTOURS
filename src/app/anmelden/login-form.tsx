"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={formAction} className="login__form" noValidate>
      {state.error ? (
        <p className="alert alert--danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="field">
        <label htmlFor="email">E-Mail-Adresse</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button className="btn btn--brand" type="submit" disabled={pending}>
        {pending ? "Anmeldung läuft …" : "Anmelden"}
      </button>
    </form>
  );
}
