"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Navigation, NavItem, NavLink } from "@/server/navigation/types";
import { NavIconSvg } from "./nav-icons";

const OPEN_DELAY = 70;
const CLOSE_DELAY = 200;

function isActive(pathname: string, item: NavItem) {
  return item.activePrefixes.some((p) => (p.endsWith("-") ? pathname.startsWith(p) : pathname === p || pathname.startsWith(`${p}/`)));
}

function LinkRow({ l, onNavigate }: { l: NavLink; onNavigate: () => void }) {
  const inner = (
    <>
      {l.icon ? <NavIconSvg name={l.icon} /> : null}
      <span className="mx-link__text">
        <span className="mx-link__label">{l.label}</span>
        {l.description ? <span className="mx-link__desc">{l.description}</span> : null}
      </span>
      {typeof l.count === "number" ? <span className="mx-link__count tabular">{l.count}</span> : null}
    </>
  );
  return l.href.startsWith("tel:") || l.href.startsWith("mailto:") ? (
    <a className="mx-link" href={l.href}>
      {inner}
    </a>
  ) : (
    <Link className="mx-link" href={l.href as never} onClick={onNavigate}>
      {inner}
    </Link>
  );
}

function Panel({ item, visual, onNavigate }: { item: NavItem; visual: ReactNode; onNavigate: () => void }) {
  const cols = item.columns ?? [];
  return (
    <div className={`mx-grid mx-grid--${cols.length + (item.intro ? 1 : 0)}${item.feature ? " has-feature" : ""}`}>
      {item.intro ? (
        <div className="mx-col mx-intro" style={{ "--i": 0 } as React.CSSProperties}>
          <p className="mx-col__title">{item.label}</p>
          <p className="mx-intro__title">{item.intro.title}</p>
          <p className="mx-intro__text">{item.intro.text}</p>
          {item.intro.cta ? (
            <Link className="btn btn--brand btn--arrow" href={item.intro.cta.href as never} onClick={onNavigate}>
              {item.intro.cta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
      {cols.map((c, i) => (
        <div key={c.title} className="mx-col" style={{ "--i": i + (item.intro ? 1 : 0) } as React.CSSProperties}>
          <p className="mx-col__title">{c.title}</p>
          {c.search ? (
            <form className="mx-search" action={c.search.action} method="get" role="search" onSubmit={onNavigate}>
              <label className="sr-only" htmlFor={`mx-q-${item.key}`}>
                Reiseziel suchen
              </label>
              <NavIconSvg name="search" />
              <input id={`mx-q-${item.key}`} name={c.search.name} placeholder={c.search.placeholder} autoComplete="off" maxLength={60} />
              <button type="submit" aria-label="Suchen">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          ) : null}
          <ul className="mx-links">
            {c.links.map((l) => (
              <li key={l.href + l.label}>
                <LinkRow l={l} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {item.feature ? (
        <Link
          href={item.feature.href as never}
          className={`mx-feature${item.feature.visual.kind === "photo" ? " mx-feature--photo" : ""}`}
          style={{ "--i": cols.length + 1 } as React.CSSProperties}
          onClick={onNavigate}
        >
          <span className="mx-feature__visual">{visual}</span>
          <span className="mx-feature__shade" aria-hidden="true" />
          <span className="mx-feature__body">
            <span className="mx-feature__eyebrow">{item.feature.eyebrow}</span>
            <strong>{item.feature.title}</strong>
            {item.feature.text ? <span className="mx-feature__text">{item.feature.text}</span> : null}
            <span className="mx-feature__cta">
              {item.feature.cta}
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </span>
        </Link>
      ) : null}
    </div>
  );
}

export function SiteHeader({ nav, visuals }: { nav: Navigation; visuals: Record<string, ReactNode> }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // Open state is bound to the path it was opened on, so navigation closes it without an effect.
  const [openOn, setOpenOn] = useState<{ key: string; path: string } | null>(null);
  const [mobileOn, setMobileOn] = useState<string | null>(null);
  const open = openOn?.path === pathname ? openOn.key : null;
  const mobileOpen = mobileOn === pathname;
  const [sheetH, setSheetH] = useState(0);

  const headerRef = useRef<HTMLElement>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timer = useRef<number | undefined>(undefined);
  const mobileRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback((key: string | null) => setOpenOn(key ? { key, path: pathname } : null), [pathname]);
  const closeAll = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpenOn(null);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The white sheet keeps its place while switching items and only animates its height → no flicker.
  useLayoutEffect(() => {
    const el = open ? panelRefs.current[open] : null;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetH(el.offsetHeight));
    ro.observe(el);
    setSheetH(el.offsetHeight);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const trigger = headerRef.current?.querySelector<HTMLButtonElement>(`[data-mx="${open}"]`);
      closeAll();
      trigger?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closeAll();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open, closeAll]);

  // mobile sheet: scroll lock, focus trap, Escape
  useEffect(() => {
    if (!mobileOpen) return;
    document.documentElement.classList.add("menu-open");
    mobileRef.current?.querySelector<HTMLElement>("button, a, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOn(null);
        burgerRef.current?.focus();
      }
      if (e.key === "Tab" && mobileRef.current) {
        const items = Array.from(mobileRef.current.querySelectorAll<HTMLElement>("a, button, input, summary"));
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
    };
  }, [mobileOpen]);

  const hoverOpen = (key: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(key), open ? 0 : OPEN_DELAY);
  };
  const hoverClose = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(null), CLOSE_DELAY);
  };

  const state = open ? "open" : scrolled || mobileOpen ? "scrolled" : "top";
  const lightLogo = state === "top";

  return (
    <>
      <header
        ref={headerRef}
        className="hdr"
        data-state={state}
        onPointerLeave={(e) => e.pointerType === "mouse" && hoverClose()}
        onPointerEnter={() => window.clearTimeout(timer.current)}
      >
        <div className="hdr__bar">
          <Link href="/" className="hdr__logo" aria-label="METROPOL TOURS – Startseite" onClick={closeAll}>
            <Image src={lightLogo ? "/brand/metropol-logo-light-hd.png" : "/brand/metropol-logo-hd.png"} alt="" width={124} height={50} priority />
          </Link>

          <nav className="hdr__nav" aria-label="Hauptmenü">
            <ul>
              {nav.items.map((item) => {
                const active = isActive(pathname, item);
                if (!item.columns?.length) {
                  return (
                    <li key={item.key}>
                      <Link
                        href={(item.href ?? "/") as never}
                        className={`hdr__link${active ? " is-current" : ""}`}
                        aria-current={active ? "page" : undefined}
                        onPointerEnter={(e) => e.pointerType === "mouse" && open && hoverClose()}
                        onClick={closeAll}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }
                const isOpen = open === item.key;
                return (
                  <li
                    key={item.key}
                    onBlur={(e) => {
                      // only when focus really moves elsewhere (keyboard); clicks on empty panel space keep it open
                      if (isOpen && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) closeAll();
                    }}
                  >
                    <button
                      type="button"
                      className={`hdr__link hdr__trigger${active ? " is-current" : ""}`}
                      aria-expanded={isOpen}
                      aria-controls={`mx-${item.key}`}
                      data-mx={item.key}
                      onClick={() => setOpen(isOpen ? null : item.key)}
                      onPointerEnter={(e) => e.pointerType === "mouse" && hoverOpen(item.key)}
                    >
                      {item.label}
                      <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                        <path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      </svg>
                    </button>
                    <div
                      id={`mx-${item.key}`}
                      ref={(n) => void (panelRefs.current[item.key] = n)}
                      className="mx-panel"
                      hidden={!isOpen}
                      onPointerEnter={() => window.clearTimeout(timer.current)}
                    >
                      <div className="mx-shell">
                        <Panel item={item} visual={visuals[item.key]} onNavigate={closeAll} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hdr__actions">
            <a className="hdr__phone" href={nav.phone.href} data-cursor="cta">
              <NavIconSvg name="phone" />
              <span>{nav.phone.display}</span>
            </a>
            <Link href={nav.primary.href as never} className="btn btn--brand btn--sm hdr__cta" data-magnetic="0.25" onClick={closeAll}>
              {nav.primary.label}
            </Link>
            <button
              ref={burgerRef}
              type="button"
              className="hdr__burger"
              aria-expanded={mobileOpen}
              aria-controls="mnav"
              onClick={() => setMobileOn(mobileOpen ? null : pathname)}
            >
              <span className="sr-only">{mobileOpen ? "Menü schließen" : "Menü öffnen"}</span>
              <span className="hdr__burger-lines" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="mx-sheet" aria-hidden="true" style={{ blockSize: open ? sheetH : 0 }} />
      </header>
      <div className="mx-scrim" data-open={open ? "true" : "false"} aria-hidden="true" onClick={closeAll} />

      <div id="mnav" ref={mobileRef} className="mnav" hidden={!mobileOpen} role="dialog" aria-modal="true" aria-label="Menü">
        <div className="mnav__top">
          <Image src="/brand/metropol-logo-hd.png" alt="METROPOL TOURS" width={110} height={44} />
          <button type="button" className="mnav__close" onClick={() => setMobileOn(null)}>
            <span className="sr-only">Menü schließen</span>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form className="mx-search mnav__search" action="/reisen" method="get" role="search">
          <label className="sr-only" htmlFor="mnav-q">
            Reiseziel suchen
          </label>
          <NavIconSvg name="search" />
          <input id="mnav-q" name="q" placeholder="Wohin möchten Sie?" autoComplete="off" maxLength={60} />
          <button type="submit" aria-label="Suchen">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <nav className="mnav__list" aria-label="Mobiles Menü">
          {nav.items.map((item) =>
            item.columns?.length ? (
              <details key={item.key} className="mnav__group" open={isActive(pathname, item) || undefined}>
                <summary>
                  {item.label}
                  <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true">
                    <path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </summary>
                <div className="mnav__sub">
                  {item.columns.map((c) => (
                    <div key={c.title}>
                      <p className="mx-col__title">{c.title}</p>
                      <ul className="mx-links">
                        {c.links.map((l) => (
                          <li key={l.href + l.label}>
                            <LinkRow l={l} onNavigate={() => setMobileOn(null)} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <Link key={item.key} href={(item.href ?? "/") as never} className="mnav__item" onClick={() => setMobileOn(null)}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="mnav__actions">
          <Link className="btn btn--brand btn--lg" href={nav.primary.href as never} onClick={() => setMobileOn(null)}>
            {nav.primary.label}
          </Link>
          <Link className="btn btn--lg" href={nav.secondary.href as never} onClick={() => setMobileOn(null)}>
            {nav.secondary.label}
          </Link>
          <a className="mnav__phone" href={nav.phone.href}>
            <NavIconSvg name="phone" /> {nav.phone.display}
          </a>
        </div>
      </div>
    </>
  );
}
