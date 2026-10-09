import { Fragment, type ElementType } from "react";

/**
 * Server-side word splitting for mask/line reveals. The sentence stays readable for assistive tech
 * (aria-label on the parent, fragments aria-hidden). Stagger index goes into --i, timing is pure CSS.
 */
export function SplitText({
  as: Tag = "span",
  text,
  className,
  reveal = "mask",
  delay = 0,
  id,
}: {
  as?: ElementType;
  text: string;
  className?: string;
  reveal?: "mask" | "mask-fast" | "soft";
  delay?: number;
  id?: string;
}) {
  const lines = text.split("\n");
  let i = 0;
  return (
    <Tag id={id} className={className ? `split ${className}` : "split"} aria-label={text.replace(/\n/g, " ")} data-reveal={reveal} style={{ "--rv-delay": `${delay}ms` } as React.CSSProperties}>
      {lines.map((line, li) => (
        <span key={li} className="split__line" aria-hidden="true">
          {line.split(" ").map((word, wi, words) => (
            <Fragment key={wi}>
              <span className="split__i">
                <span className="split__in" style={{ "--i": i++ } as React.CSSProperties}>
                  {word}
                </span>
              </span>
              {wi < words.length - 1 ? " " : null}
            </Fragment>
          ))}
        </span>
      ))}
    </Tag>
  );
}
