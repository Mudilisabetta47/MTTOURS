import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell" style={{ paddingBlock: "6rem", display: "grid", gap: "1rem" }}>
      <p className="mono-label">404</p>
      <h1>Seite nicht gefunden</h1>
      <p>Diese Adresse gibt es nicht (mehr).</p>
      <p>
        <Link className="btn btn--ghost" href="/">
          Zur Startseite
        </Link>
      </p>
    </main>
  );
}
