import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="shell" style={{ paddingBlock: "6rem", display: "grid", gap: "1rem" }}>
      <p className="mono-label">403</p>
      <h1>Keine Berechtigung</h1>
      <p>Ihr Konto hat keinen Zugriff auf diesen Bereich. Wenden Sie sich an die Verwaltung, falls das ein Fehler ist.</p>
      <p>
        <Link className="btn btn--ghost" href="/">
          Zur Startseite
        </Link>
      </p>
    </main>
  );
}
