import Image from "next/image";
import type { NavFeature } from "@/server/navigation/types";
import { DestinationArt, artFor } from "@/components/home/destination-art";

/** Server-rendered visual for a mega-menu feature card (keeps SVG/image markup out of the client bundle). */
export function NavFeatureVisual({ f }: { f: NavFeature }) {
  if (f.visual.kind === "trip") {
    return <DestinationArt d={artFor({ slug: `nav-${f.visual.slug}`, destination: f.visual.destination, motif: f.visual.motif })} className="mx-feature__media" fit="xMidYMid slice" />;
  }
  return (
    <>
      <Image src={f.visual.src} alt={f.visual.alt} fill sizes="(max-width: 1400px) 30vw, 420px" className="mx-feature__media" style={{ objectFit: "cover" }} />
      {f.visual.ki ? <span className="ki__label ki__label--br">KI-generiert</span> : null}
    </>
  );
}
