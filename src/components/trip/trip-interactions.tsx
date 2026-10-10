"use client";

import { useEffect, useRef, useState } from "react";

/** Hands a date from the page's date list to the booking card (and opens the sheet on phones). */
export function PickDepartureButton({ code, label }: { code: string; label: string }) {
  return (
    <button type="button" className="btn btn--brand btn--sm btn--arrow" onClick={() => window.dispatchEvent(new CustomEvent("trip:departure", { detail: code }))}>
      {label}
    </button>
  );
}

/** Sticky in-page navigation: active section + reading progress of the trip page. */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((x): x is HTMLElement => !!x);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-140px 0px -55% 0px" },
    );
    sections.forEach((s) => io.observe(s));

    const main = document.querySelector<HTMLElement>(".tp-main");
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!main || !barRef.current) return;
        const r = main.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.4 - r.top) / Math.max(1, r.height - window.innerHeight * 0.4)));
        barRef.current.style.transform = `scaleX(${p})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [items]);

  return (
    <nav className="tp-nav" aria-label="Abschnitte dieser Reise">
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
      <span className="tp-nav__progress" ref={barRef} aria-hidden="true" />
    </nav>
  );
}
