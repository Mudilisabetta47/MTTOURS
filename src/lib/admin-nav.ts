import type { Permission } from "./rbac";

export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  /** Only implemented modules are shown. Planned modules stay hidden instead of rendering dead links. */
  implemented: boolean;
  phase: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Grouped like the previous metours.de admin so the office finds everything in the familiar place. */
export const ADMIN_NAV: NavGroup[] = [
  {
    label: "Cockpit",
    items: [{ href: "/admin", label: "Übersicht", permission: "dashboard.view", implemented: true, phase: 1 }],
  },
  {
    label: "Buchungen",
    items: [
      { href: "/admin/buchungen", label: "Reise-Buchungen", permission: "booking.read", implemented: true, phase: 3 },
      { href: "/admin/anfragen", label: "Anfragen", permission: "inquiry.read", implemented: true, phase: 4 },
      { href: "/admin/angebote", label: "Angebote", permission: "quote.read", implemented: false, phase: 4 },
    ],
  },
  {
    label: "Reisen & Angebote",
    items: [
      { href: "/admin/reisen", label: "Reisen", permission: "trip.read", implemented: true, phase: 3 },
      { href: "/admin/destinationen", label: "Destinationen", permission: "cms.read", implemented: true, phase: 3 },
      { href: "/admin/tickets", label: "Tickets", permission: "ticket.read", implemented: false, phase: 3 },
    ],
  },
  {
    label: "Fahrten & Betrieb",
    items: [
      { href: "/admin/fahrten", label: "Fahrten", permission: "run.read", implemented: false, phase: 5 },
      { href: "/admin/disposition", label: "Disposition", permission: "dispatch.assign", implemented: false, phase: 5 },
      { href: "/admin/fahrer", label: "Fahrer", permission: "driver.read", implemented: false, phase: 5 },
      { href: "/admin/leitstelle", label: "Leitstelle (Live)", permission: "ops.view", implemented: true, phase: 6 },
    ],
  },
  {
    label: "Kunden & Verträge",
    items: [
      { href: "/admin/kunden", label: "Kunden", permission: "customer.read", implemented: false, phase: 4 },
      { href: "/admin/auftraege", label: "Aufträge", permission: "charter.read", implemented: false, phase: 4 },
    ],
  },
  {
    label: "Stammdaten",
    items: [
      { href: "/admin/haltestellen", label: "Haltestellen", permission: "stop.read", implemented: true, phase: 3 },
      { href: "/admin/fahrzeuge", label: "Fahrzeuge", permission: "vehicle.read", implemented: false, phase: 5 },
    ],
  },
  {
    label: "Finanzen",
    items: [
      { href: "/admin/zahlungen", label: "Zahlungen", permission: "payment.read", implemented: false, phase: 3 },
      { href: "/admin/rechnungen", label: "Rechnungen", permission: "invoice.read", implemented: false, phase: 7 },
    ],
  },
  {
    label: "Kommunikation",
    items: [
      { href: "/admin/website", label: "Inhalte (CMS)", permission: "cms.read", implemented: false, phase: 8 },
      { href: "/admin/seo", label: "SEO & Weiterleitungen", permission: "seo.write", implemented: false, phase: 8 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/mitarbeiter", label: "Benutzer & Rollen", permission: "staff.read", implemented: true, phase: 1 },
      { href: "/admin/protokoll", label: "Audit-Log", permission: "audit.read", implemented: true, phase: 1 },
      { href: "/admin/einstellungen", label: "Einstellungen", permission: "settings.write", implemented: false, phase: 7 },
    ],
  },
];
