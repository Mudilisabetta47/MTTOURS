"use client";

import { useActionState } from "react";
import { createStaffAction, type CreateState } from "./actions";
import { ROLE_LABELS } from "@/lib/role-labels";
import type { RoleName } from "@/lib/rbac";


export function CreateStaffForm({ grantable }: { grantable: string[] }) {
  const [state, action, pending] = useActionState<CreateState, FormData>(createStaffAction, {});
  return (
    <form action={action} className="filters" style={{ borderBlockEnd: 0 }}>
      <div className="field">
        <label htmlFor="displayName">Name</label>
        <input id="displayName" name="displayName" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" required maxLength={254} />
      </div>
      <fieldset className="field">
        <legend className="sr-only">Rollen</legend>
        <span style={{ fontSize: "var(--step--1)", fontWeight: 600 }}>Rollen</span>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: "1rem" }}>
          {grantable.map((r) => (
            <label key={r} className="choice">
              <input type="checkbox" name="roles" value={r} /> {ROLE_LABELS[r as RoleName] ?? r}
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn btn--brand btn--sm" type="submit" disabled={pending}>
        Konto anlegen
      </button>
      {state.error ? (
        <p className="alert alert--danger" role="alert" style={{ flexBasis: "100%" }}>
          {state.error}
        </p>
      ) : null}
      {state.link ? (
        <div className="alert alert--info" role="status" style={{ flexBasis: "100%", display: "grid", gap: "0.4rem" }}>
          <strong>Konto für {state.email} angelegt.</strong>
          <span>
            Einmal-Link zum Setzen des Passworts (48 Std. gültig, wird nur jetzt angezeigt). Bitte auf sicherem Weg
            weitergeben:
          </span>
          <code style={{ wordBreak: "break-all" }}>{state.link}</code>
        </div>
      ) : null}
    </form>
  );
}
