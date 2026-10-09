import { describe, expect, it } from "vitest";
import { can, canGrantRole, isStaff, permissionsFor, requiresMfa } from "@/lib/rbac";

describe("rbac", () => {
  it("driver can only use the driver app and validate tickets", () => {
    expect([...permissionsFor(["DRIVER"])].sort()).toEqual(["driverapp.use", "ticket.validate"]);
    expect(can(["DRIVER"], "booking.read")).toBe(false);
    expect(isStaff(["DRIVER"])).toBe(false);
  });

  it("customer has no back-office permission", () => {
    expect([...permissionsFor(["CUSTOMER"])]).toEqual(["portal.use"]);
    expect(isStaff(["CUSTOMER"])).toBe(false);
  });

  it("content manager never sees payments or customers", () => {
    expect(can(["CONTENT_MANAGER"], "payment.read")).toBe(false);
    expect(can(["CONTENT_MANAGER"], "customer.read")).toBe(false);
    expect(can(["CONTENT_MANAGER"], "cms.write")).toBe(true);
  });

  it("accounting sees invoices but not operational notes or dispatch", () => {
    expect(can(["ACCOUNTING"], "invoice.issue")).toBe(true);
    expect(can(["ACCOUNTING"], "dispatch.assign")).toBe(false);
    expect(can(["ACCOUNTING"], "ops.view")).toBe(false);
  });

  it("dispatcher cannot refund or issue invoices", () => {
    expect(can(["DISPATCHER"], "refund.create")).toBe(false);
    expect(can(["DISPATCHER"], "invoice.issue")).toBe(false);
    expect(can(["DISPATCHER"], "dispatch.assign")).toBe(true);
  });

  it("only owners may grant owner/admin", () => {
    expect(canGrantRole(["OWNER"], "OWNER")).toBe(true);
    expect(canGrantRole(["ADMIN"], "ADMIN")).toBe(false);
    expect(canGrantRole(["ADMIN"], "DRIVER")).toBe(true);
    expect(canGrantRole(["OFFICE"], "DRIVER")).toBe(false);
  });

  it("privileged roles require MFA", () => {
    expect(requiresMfa(["ADMIN"])).toBe(true);
    expect(requiresMfa(["DRIVER"])).toBe(false);
  });
});
