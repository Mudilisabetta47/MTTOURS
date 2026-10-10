import { ScrollStage } from "@/components/site/scroll-stage";

/**
 * Typographic moment: the sentence lights up word by word with the scroll position.
 * Pure CSS on --p; the full sentence is always in the DOM for assistive tech and search engines.
 */
const SENTENCE =
  "Wir fahren Schulklassen, Vereine, Firmen und Reisende. Ab Hannover, Bremen und Hamburg – quer durch Europa. Bus und Fahrer aus einer Hand.";
const ACCENT = new Set(["Hannover,", "Bremen", "Hamburg", "Europa.", "Fahrer"]);

export function Statement() {
  const words = SENTENCE.split(" ");
  return (
    <ScrollStage className="statement" start="top bottom" end="bottom center" reducedValue={1} aria-label="Über uns in einem Satz">
      <div className="shell">
        <p className="statement__text" style={{ "--n": words.length } as React.CSSProperties}>
          {words.map((w, i) => (
            <span key={i} className={ACCENT.has(w) ? "statement__w statement__w--accent" : "statement__w"} style={{ "--i": i } as React.CSSProperties}>
              {w}{" "}
            </span>
          ))}
        </p>
      </div>
    </ScrollStage>
  );
}
