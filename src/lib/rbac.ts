/**
 * Role-based access control. Pure data + pure functions so it is testable
 * and identical wherever it is evaluated. The UI only hides — the server decides.
 */

export const ROLES = [
  "OWNER",
  "ADMIN",
  "DISPATCHER",
  "OFFICE",
  "DRIVER",
  "ACCOUNTING",
  "CONTENT_MANAGER",
  "CUSTOMER",
] as const;

export type RoleName = (typeof ROLES)[number];

export const PERMISSIONS = [
  "dashboard.view",
  "inquiry.read",
  "inquiry.write",
  "quote.read",
  "quote.write",
  "quote.send",
  "calculation.params.approve",
  "charter.read",
  "charter.write",
  "run.read",
  "run.write",
  "dispatch.assign",
  "trip.read",
  "trip.write",
  "trip.publish",
  "price.write",
  "booking.read",
  "booking.write",
  "booking.cancel",
  "customer.read",
  "customer.write",
  "customer.pii.export",
  "driver.read",
  "driver.write",
  "driver.documents.read",
  "vehicle.read",
  "vehicle.write",
  "stop.read",
  "stop.write",
  "ticket.read",
  "ticket.resend",
  "ticket.validate",
  "payment.read",
  "refund.create",
  "invoice.read",
  "invoice.write",
  "invoice.issue",
  "cms.read",
  "cms.write",
  "seo.write",
  "redirect.write",
  "staff.read",
  "staff.write",
  "role.grant",
  "audit.read",
  "settings.write",
  "ops.view",
  "ops.write",
  "driverapp.use",
  "portal.use",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS.filter((p) => p !== "driverapp.use" && p !== "portal.use");

const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  OWNER: ALL,
  // ADMIN: everything except granting OWNER-level role changes is handled in grantRole()
  ADMIN: ALL,
  DISPATCHER: [
    "dashboard.view",
    "inquiry.read",
    "inquiry.write",
    "quote.read",
    "quote.write",
    "quote.send",
    "charter.read",
    "charter.write",
    "run.read",
    "run.write",
    "dispatch.assign",
    "trip.read",
    "booking.read",
    "customer.read",
    "driver.read",
    "driver.documents.read",
    "vehicle.read",
    "vehicle.write",
    "stop.read",
    "stop.write",
    "ticket.read",
    "ops.view",
    "ops.write",
  ],
  OFFICE: [
    "dashboard.view",
    "inquiry.read",
    "inquiry.write",
    "quote.read",
    "quote.write",
    "quote.send",
    "charter.read",
    "charter.write",
    "run.read",
    "trip.read",
    "trip.write",
    "booking.read",
    "booking.write",
    "booking.cancel",
    "customer.read",
    "customer.write",
    "ticket.read",
    "ticket.resend",
    "payment.read",
    "invoice.read",
    "stop.read",
    "vehicle.read",
    "driver.read",
    "ops.view",
  ],
  DRIVER: ["driverapp.use", "ticket.validate"],
  ACCOUNTING: [
    "dashboard.view",
    "booking.read",
    "customer.read",
    "payment.read",
    "refund.create",
    "invoice.read",
    "invoice.write",
    "invoice.issue",
    "charter.read",
    "quote.read",
  ],
  CONTENT_MANAGER: ["dashboard.view", "trip.read", "trip.write", "cms.read", "cms.write", "seo.write", "redirect.write", "stop.read"],
  CUSTOMER: ["portal.use"],
};

export function permissionsFor(roles: readonly RoleName[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) for (const p of ROLE_PERMISSIONS[role]) set.add(p);
  return set;
}

export function can(roles: readonly RoleName[], permission: Permission): boolean {
  return permissionsFor(roles).has(permission);
}

export const STAFF_ROLES: readonly RoleName[] = ["OWNER", "ADMIN", "DISPATCHER", "OFFICE", "ACCOUNTING", "CONTENT_MANAGER"];

export function isStaff(roles: readonly RoleName[]): boolean {
  return roles.some((r) => STAFF_ROLES.includes(r));
}

/** Roles a user may grant. Only OWNER can create other OWNER/ADMIN accounts. */
export function canGrantRole(actorRoles: readonly RoleName[], target: RoleName): boolean {
  if (actorRoles.includes("OWNER")) return true;
  if (actorRoles.includes("ADMIN")) return target !== "OWNER" && target !== "ADMIN";
  return false;
}

/** Privileged roles must use 2FA before production go-live (enforced once MFA ships). */
export function requiresMfa(roles: readonly RoleName[]): boolean {
  return roles.some((r) => r === "OWNER" || r === "ADMIN" || r === "ACCOUNTING");
}
