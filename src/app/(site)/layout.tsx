import "@/styles/site.css";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { MotionRoot } from "@/components/site/motion-root";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site">
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="main" className="site-main">
        {children}
      </main>
      <SiteFooter />
      <MotionRoot />
    </div>
  );
}
