"use client";

import { useState } from "react";

/** Opens the booking card (desktop: scrolls to it, phones: opens the sheet). */
export function OpenBookingButton({ label, className }: { label: string; className?: string }) {
  return (
    <button type="button" className={className ?? "btn btn--brand btn--lg btn--arrow"} onClick={() => window.dispatchEvent(new CustomEvent("trip:departure", { detail: "" }))}>
      {label}
    </button>
  );
}

/** Native share sheet where available, otherwise copies the link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split("#")[0]!;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // dismissed share sheet or blocked clipboard – nothing to do
    }
  };
  return (
    <button type="button" className="tp-act" onClick={share} aria-live="polite">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
        <path d="M12 3v12m0-12-4 4m4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {copied ? "Link kopiert" : "Teilen"}
    </button>
  );
}
