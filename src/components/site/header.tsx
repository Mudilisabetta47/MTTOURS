"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "@/content/company";

const NAV = [
  { href: "/reisen", label: "Reisen" },
  { href: "/bus-mieten", label: "Bus mieten" },
  { href: "/#abfahrtsorte", label: "Abfahrtsorte" },
  { href: "/#kontakt", label: "Kontakt" },
] as const;

export function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("menu-open");
    const first = menuRef.current?.querySelector<HTMLElement>("a,button");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && menuRef.current) {
        const items = Array.from(menuRef.current.querySelectorAll<HTMLElement>("a,button"));
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        if (!firstEl || !lastEl) return;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
    };
  }, [open]);

  return (
    <header className={`site-header${solid || open ? " is-solid" : ""}`}>
      <div className="site-header__bar">
        <Link href="/" className="site-header__logo" aria-label="METROPOL TOURS – Startseite">
          <Image src="/brand/metropol-logo-white.png" alt="" width={124} height={50} priority />
        </Link>
        <nav className="site-header__nav" aria-label="Hauptmenü">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href as never} className="site-header__link">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__actions">
          <a className="site-header__phone" href={`tel:${COMPANY.phone.replace(/\s/g, "")}`} data-cursor="cta">
            {COMPANY.phoneDisplay}
          </a>
          <Link href="/bus-mieten#anfrage" className="btn btn--brand btn--sm" data-magnetic="0.25">
            Angebot anfragen
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="site-header__toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "Menü schließen" : "Menü öffnen"}</span>
            <span className="site-header__burger" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div id="site-menu" ref={menuRef} className="site-menu" hidden={!open}>
        <nav aria-label="Mobiles Menü">
          {NAV.map((n, i) => (
            <Link key={n.href} href={n.href as never} style={{ "--i": i } as React.CSSProperties} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="site-menu__contact">
          <a href={`tel:${COMPANY.phone.replace(/\s/g, "")}`}>{COMPANY.phoneDisplay}</a>
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </div>
      </div>
    </header>
  );
}
