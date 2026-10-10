import type { NavIcon } from "@/server/navigation/types";

/** 20px line icons, stroke = currentColor. Hand-drawn paths, no icon library. */
const PATHS: Record<NavIcon, string> = {
  compass: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z",
  sun: "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8",
  city: "M3 21V10l5-3v14M8 21V4l7 4v13M15 21v-9l6 2v7M2 21h20M11 10h1M11 13h1M11 16h1",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v5M16 3v5M8 14h3M8 17h6",
  tag: "M3 12V4h8l10 10-8 8L3 12Zm5-4.5h.01",
  pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-2.5 6.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01",
  ticket: "M3 8V6h18v2a2 2 0 0 0 0 4v2a2 2 0 0 0 0 4v0H3v0a2 2 0 0 0 0-4v-2a2 2 0 0 0 0-4ZM14 6v12",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5M12 8h.01",
  phone: "M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1Z",
  bus: "M5 17V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v11M5 17h14M5 12h14M7 20v-3M17 20v-3M8 15h.01M16 15h.01M9 7h6",
  wheel: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM12 3v6M4.5 15.5 9.5 13.5M19.5 15.5l-5-2",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a5.5 5.5 0 0 1 3 5",
  school: "M2 9l10-5 10 5-10 5L2 9Zm4 2v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  briefcase: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  plane: "M2 16l20-8-6 13-3-6-6-2 3-1M10 13l3 2",
  shuttle: "M3 16V8a2 2 0 0 1 2-2h10l4 4v6M3 16h16M6 19a2 2 0 1 0 0-4M16 19a2 2 0 1 0 0-4M3 11h16",
  expo: "M3 21V9l9-5 9 5v12M3 21h18M8 21v-6h8v6M12 4v5",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8",
  building: "M4 21V5l8-3v19M12 21V8l8 3v10M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
};

export function NavIconSvg({ name }: { name: NavIcon }) {
  return (
    <svg className="navicon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
