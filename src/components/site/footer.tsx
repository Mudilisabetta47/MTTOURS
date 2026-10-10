import Link from "next/link";
import { COMPANY, LEGAL_LINKS } from "@/content/company";
import { DEPARTURE_POINTS } from "@/content/places";

/** Large brand footer. Revealed underneath the last stage (see .site-footer in site.css). */
export function SiteFooter() {
  const tel = COMPANY.phone.replace(/\s/g, "");
  return (
    <footer id="kontakt" className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__top">
          <p className="site-footer__claim">
            Wir fahren.
            <br />
            Sie reisen.
          </p>
          <div className="site-footer__contact">
            <a className="site-footer__big" href={`tel:${tel}`} data-cursor="cta">
              {COMPANY.phoneDisplay}
            </a>
            <a className="site-footer__mail" href={`mailto:${COMPANY.email}`}>
              {COMPANY.email}
            </a>
            <p className="site-footer__hours">{COMPANY.hours}</p>
          </div>
        </div>

        <div className="site-footer__grid">
          <div>
            <h2 className="mono-label">Unterwegs</h2>
            <ul>
              <li>
                <Link href="/pauschalreisen">Pauschalreisen</Link>
              </li>
              <li>
                <Link href="/wochenendtrips">Wochenendtrips</Link>
              </li>
              <li>
                <Link href="/reisen">Alle Reisen</Link>
              </li>
              <li>
                <Link href="/bus-mieten">Bus mit Fahrer mieten</Link>
              </li>
              <li>
                <Link href="/bus-mieten#anfrage">Angebot anfragen</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="mono-label">Abfahrtsorte</h2>
            <ul>
              {DEPARTURE_POINTS.map((d) => (
                <li key={d.slug}>
                  {d.stop}
                  <span className="site-footer__sub">{d.address}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mono-label">Unternehmen</h2>
            <address>
              {COMPANY.legalName}
              <br />
              {COMPANY.street}
              <br />
              {COMPANY.postalCode} {COMPANY.city}
            </address>
          </div>
          <div>
            <h2 className="mono-label">Rechtliches</h2>
            <ul>
              <li>
                <Link href="/impressum">Impressum</Link>
              </li>
              <li>
                <a href={LEGAL_LINKS.privacy}>Datenschutz</a>
              </li>
              <li>
                <a href={LEGAL_LINKS.terms}>AGB</a>
              </li>
              <li>
                <a href={LEGAL_LINKS.withdrawal}>Widerrufsbelehrung</a>
              </li>
            </ul>
          </div>
        </div>

        <p className="site-footer__wordmark" aria-hidden="true">
          Metropol <span>Tours</span>
        </p>

        <div className="site-footer__base">
          <span>© {new Date().getFullYear()} {COMPANY.legalName}</span>
          <span>Diese Website setzt keine Tracking-Cookies.</span>
          <Link href="/anmelden">Mitarbeiter-Login</Link>
        </div>
      </div>
    </footer>
  );
}
