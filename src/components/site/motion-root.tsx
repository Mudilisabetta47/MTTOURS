"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motionEnv, refreshAll } from "@/motion/engine";
import { initCursor, initMagnetic, initReveals } from "@/motion/interactions";

/** Boots reveals, magnetic buttons and the custom cursor; re-scans after client navigation. */
export function MotionRoot() {
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.dataset.motion = motionEnv().reduced ? "reduced" : "full";
    const offCursor = initCursor();
    return offCursor;
  }, []);
  useEffect(() => {
    const offReveal = initReveals();
    const offMagnetic = initMagnetic();
    const t = window.setTimeout(refreshAll, 50);
    return () => {
      offReveal();
      offMagnetic();
      window.clearTimeout(t);
    };
  }, [pathname]);
  return null;
}
