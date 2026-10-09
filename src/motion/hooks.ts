"use client";

import { useEffect, useRef, type RefObject } from "react";
import { motionEnv, track, type TrackOptions } from "./engine";

/**
 * Register a scroll timeline for `ref`. `onUpdate` receives progress 0..1 and should only
 * write transforms / CSS variables / canvas — never read layout.
 * In reduced-motion mode it is called once with `reducedValue` and never again.
 */
export function useScrollTimeline<T extends Element>(
  ref: RefObject<T | null>,
  onUpdate: (p: number) => void,
  opts: Omit<TrackOptions, "onUpdate"> & { reducedValue?: number } = {},
) {
  const cb = useRef(onUpdate);
  useEffect(() => {
    cb.current = onUpdate;
  });
  const { start, end, reducedValue } = opts;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (motionEnv().reduced) {
      cb.current(reducedValue ?? 1);
      return;
    }
    return track(el, { start, end, onUpdate: (p) => cb.current(p) });
  }, [ref, start, end, reducedValue]);
}
