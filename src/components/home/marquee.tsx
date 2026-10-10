import { ScrollStage } from "@/components/site/scroll-stage";
import { DEPARTURE_POINTS, DESTINATIONS } from "@/content/places";

/** Scroll-linked type band: two rows of real place names drifting in opposite directions. */
export function PlaceMarquee() {
  const origins = DEPARTURE_POINTS.map((d) => d.name);
  const dests = DESTINATIONS.map((d) => d.name);
  const row = (names: string[], key: string) =>
    [...names, ...names, ...names].map((n, i) => (
      <span key={`${key}${i}`} className={i % 2 ? "marquee__word marquee__word--outline" : "marquee__word"}>
        {n}
        <i aria-hidden="true">✦</i>
      </span>
    ));
  return (
    <ScrollStage className="marquee" start="top bottom" end="bottom top" reducedValue={0.5} aria-label="Abfahrtsorte und Reiseziele">
      <div className="marquee__row marquee__row--a" aria-hidden="true">
        {row([...origins, ...dests.slice(0, 4)], "a")}
      </div>
      <div className="marquee__row marquee__row--b" aria-hidden="true">
        {row([...dests.slice(4), ...origins, ...dests.slice(0, 2)], "b")}
      </div>
      <p className="sr-only">
        Zustiege in {origins.join(", ")}. Ziele aus dem Programm: {dests.join(", ")}.
      </p>
    </ScrollStage>
  );
}
