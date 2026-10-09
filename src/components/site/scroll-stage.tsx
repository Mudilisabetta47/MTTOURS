"use client";

import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useScrollTimeline } from "@/motion/hooks";
import type { TrackOptions } from "@/motion/engine";

/**
 * Writes the scroll progress of its element into the CSS variable `--p` (0..1).
 * All visual consequences live in CSS (`calc(var(--p) * …)`), so children stay Server Components
 * and the only per-frame work is one style write.
 */
export function ScrollStage({
  as: Tag = "section",
  start,
  end,
  reducedValue = 1,
  className,
  style,
  children,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: {
  as?: ElementType;
  start?: TrackOptions["start"];
  end?: TrackOptions["end"];
  reducedValue?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useScrollTimeline(
    ref,
    (p) => {
      ref.current?.style.setProperty("--p", p.toFixed(4));
    },
    { start, end, reducedValue },
  );
  return (
    <Tag ref={ref} id={id} className={className} style={style} aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
      {children}
    </Tag>
  );
}
