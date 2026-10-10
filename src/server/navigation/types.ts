/**
 * Navigation model. Today it is assembled from a static link config plus live database facts
 * (adapter.ts). Later the CMS provides the static part through the same NavigationSource interface.
 */
export type NavIcon =
  | "compass" | "sun" | "city" | "calendar" | "tag" | "pin" | "search" | "help" | "ticket" | "info" | "phone"
  | "bus" | "wheel" | "users" | "school" | "flag" | "briefcase" | "plane" | "shuttle" | "expo" | "route" | "building" | "mail";

export interface NavLink {
  label: string;
  href: string;
  icon?: NavIcon;
  description?: string;
  count?: number;
}

export interface NavColumn {
  title: string;
  links: NavLink[];
  /** optional inline search form instead of/above links */
  search?: { action: string; name: string; placeholder: string };
}

export interface NavFeature {
  eyebrow: string;
  title: string;
  text?: string;
  href: string;
  cta: string;
  /** "trip" uses the destination illustration, "photo" a real/labelled image */
  visual: { kind: "trip"; slug: string; destination: string; motif: string | null } | { kind: "photo"; src: string; alt: string; ki: boolean };
  tone?: "light" | "brand";
}

export interface NavItem {
  key: string;
  label: string;
  /** plain link when there are no columns */
  href?: string;
  intro?: { title: string; text: string; cta?: { label: string; href: string } };
  columns?: NavColumn[];
  feature?: NavFeature;
  activePrefixes: string[];
}

export interface Navigation {
  items: NavItem[];
  phone: { display: string; href: string };
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}

export interface NavigationSource {
  load(): Promise<Navigation>;
}
