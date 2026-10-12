import type { Tone } from "@/components/admin/status-pill";

export const TRIP_STATUS: Record<string, { label: string; tone: Tone }> = {
  PUBLISHED: { label: "veröffentlicht", tone: "ok" },
  REVIEW: { label: "in Prüfung", tone: "warn" },
  DRAFT: { label: "Entwurf", tone: "neutral" },
  ARCHIVED: { label: "archiviert", tone: "danger" },
};
export const TYPE_LABEL: Record<string, string> = { PACKAGE_TOUR: "Pauschalreise", TRANSPORT_ONLY: "Wochenendtrip", DAY_TRIP: "Tagesfahrt", GROUP_TOUR: "Gruppenreise", LINE_TICKET: "Linie" };
