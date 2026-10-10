import "@/styles/site.css";
import "@/styles/nav.css";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MotionRoot } from "@/components/site/motion-root";
import { NavFeatureVisual } from "@/components/site/nav-feature-visual";
import { navigationSource } from "@/server/navigation/adapter";

// Availability, seats and "ab" prices must reflect the database at request time, never the build.
export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = await navigationSource.load();
  const visuals = Object.fromEntries(nav.items.filter((i) => i.feature).map((i) => [i.key, <NavFeatureVisual key={i.key} f={i.feature!} />]));
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <SiteHeader nav={nav} visuals={visuals} />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter />
      <MotionRoot />
    </div>
  );
}
