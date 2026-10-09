import type { Metadata } from "next";
import Image from "next/image";

// Phase 1 placeholder. The public website is built in phase 2 and replaces this page.
// The staging environment is not indexed (see robots.ts).
export const metadata: Metadata = {
  title: "METROPOL TOURS – neue Plattform (Staging)",
  robots: { index: false, follow: false },
};

export default function StagingHome() {
  return (
    <main id="main" className="staging">
      <div className="shell staging__inner">
        <Image src="/brand/metropol-logo-white.png" alt="METROPOL TOURS GmbH" width={237} height={96} priority />
        <p className="mono-label">Staging · Phase 1 Foundation</p>
        <h1>Die neue Plattform entsteht hier.</h1>
        <p>
          Buchungen und Anfragen laufen bis zum Umstieg weiter über{" "}
          <a href="https://www.metours.de/">www.metours.de</a>.
        </p>
        <p>
          <a className="btn btn--brand" href="tel:+4951180781106">
            +49 511 80781106
          </a>{" "}
          <a className="btn btn--ghost staging__ghost" href="mailto:kundenservice@metours.de">
            kundenservice@metours.de
          </a>
        </p>
      </div>
      <style>{`
        .staging{min-block-size:100svh;display:grid;place-items:center;background:var(--night);color:#fff}
        .staging__inner{display:grid;gap:1.4rem;justify-items:start;padding-block:4rem}
        .staging h1{font-size:var(--step-5);letter-spacing:var(--track-display);line-height:var(--lh-display);max-inline-size:14ch}
        .staging p{color:color-mix(in oklab,#fff 78%,transparent)}
        .staging .mono-label{color:var(--brand)}
        .staging__ghost{--btn-fg:#fff;--btn-hover:color-mix(in oklab,#fff 10%,transparent);border-color:color-mix(in oklab,#fff 30%,transparent)}
      `}</style>
    </main>
  );
}
