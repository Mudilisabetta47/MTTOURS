import Image from "next/image";

/**
 * AI-generated mood image. Always labelled (transparency, and so nobody mistakes it for our fleet).
 * Never use for vehicles or the company itself – those must be real photos.
 */
export function KiImage({
  src,
  alt,
  priority = false,
  sizes = "100vw",
  className,
  labelPosition = "br",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  labelPosition?: "br" | "bl" | "tr";
}) {
  return (
    <div className={className ? `ki ${className}` : "ki"}>
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} quality={78} />
      <span className={`ki__label ki__label--${labelPosition}`}>KI-generiert</span>
    </div>
  );
}
