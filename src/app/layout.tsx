import type { Metadata, Viewport } from "next";
import { Anton, DM_Sans } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/base.css";

// Self-hosted at build time: no request to Google at runtime.
const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-dm-sans", display: "swap" });
// Condensed display face close to the logo lettering. Used only for large statements.
const anton = Anton({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-anton", display: "swap" });

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "METROPOL TOURS", template: "%s | METROPOL TOURS" },
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#050607",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="light" className={`${dmSans.variable} ${anton.variable}`}>
      <body>{children}</body>
    </html>
  );
}
