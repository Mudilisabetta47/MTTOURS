import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { loginWithPassword } from "@/server/auth/login";
import { hashPassword } from "@/server/auth/password";
import { resolveSession, revokeSession } from "@/server/auth/session-store";
import { createAccount, revokeRole, setPasswordWithToken, StaffError } from "@/server/staff/service";
import { testDb, truncateAll } from "./helpers";

const db = testDb();
beforeEach(() => truncateAll(db));
afterAll(() => db.$disconnect());

const PASSWORD = "Reisebus nach Hamburg 2027";

async function makeUser(email: string, roles: ("OWNER" | "DRIVER" | "OFFICE")[]) {
  return db.user.create({
    data: { email, displayName: email, passwordHash: await hashPassword(PASSWORD), roles: { create: roles.map((role) => ({ role })) } },
  });
}

describe("authentication", () => {
  it("logs in with argon2id password and resolves an HttpOnly-cookie session token", async () => {
    await makeUser("chef@example.org", ["OWNER"]);
    const res = await loginWithPassword(db, { email: " Chef@Example.org ", password: PASSWORD, ipHash: "ip1", userAgent: "vitest" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const session = await resolveSession(db, res.token);
    expect(session?.roles).toEqual(["OWNER"]);
    // only the hash of the token is stored
    expect(await db.session.count({ where: { id: res.token } })).toBe(0);
    await revokeSession(db, res.token);
    expect(await resolveSession(db, res.token)).toBeNull();
  });

  it("fails with a generic reason and audits the attempt", async () => {
    await makeUser("a@example.org", ["OFFICE"]);
    const wrong = await loginWithPassword(db, { email: "a@example.org", password: "falsch", ipHash: null, userAgent: null });
    const unknown = await loginWithPassword(db, { email: "nobody@example.org", password: "x", ipHash: null, userAgent: null });
    expect(wrong).toEqual({ ok: false, reason: "invalid" });
    expect(unknown).toEqual({ ok: false, reason: "invalid" });
    expect(await db.auditLog.count({ where: { action: "auth.login.failed" } })).toBe(2);
  });

  it("rate-limits brute force per account", async () => {
    await makeUser("b@example.org", ["OFFICE"]);
    for (let i = 0; i < 8; i++) await loginWithPassword(db, { email: "b@example.org", password: "falsch", ipHash: null, userAgent: null });
    const blocked = await loginWithPassword(db, { email: "b@example.org", password: PASSWORD, ipHash: null, userAgent: null });
    expect(blocked).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("successful logins do not count towards the account lockout", async () => {
    await makeUser("d@example.org", ["OFFICE"]);
    for (let i = 0; i < 12; i++) {
      expect((await loginWithPassword(db, { email: "d@example.org", password: PASSWORD, ipHash: null, userAgent: null })).ok).toBe(true);
    }
  });

  it("inactive users cannot log in", async () => {
    const u = await makeUser("c@example.org", ["DRIVER"]);
    await db.user.update({ where: { id: u.id }, data: { isActive: false } });
    expect((await loginWithPassword(db, { email: "c@example.org", password: PASSWORD, ipHash: null, userAgent: null })).ok).toBe(false);
  });
});

describe("staff management", () => {
  it("creates an account with a single-use set-password link", async () => {
    const owner = await makeUser("owner@example.org", ["OWNER"]);
    const { userId, setPasswordToken } = await createAccount(db, { id: owner.id, roles: ["OWNER"] }, {
      email: "fahrer@example.org",
      displayName: "Fahrer Eins",
      roles: ["DRIVER"],
    });
    const hash = await hashPassword("Fahrer Passwort 2027!");
    expect(await setPasswordWithToken(db, setPasswordToken, hash)).toBe(true);
    expect(await setPasswordWithToken(db, setPasswordToken, hash)).toBe(false);
    const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.passwordHash).toBe(hash);
    expect(await db.auditLog.count({ where: { entityId: userId } })).toBeGreaterThanOrEqual(2);
  });

  it("an admin cannot create another admin", async () => {
    const admin = await db.user.create({ data: { email: "adm@example.org", displayName: "Adm", roles: { create: [{ role: "ADMIN" }] } } });
    await expect(
      createAccount(db, { id: admin.id, roles: ["ADMIN"] }, { email: "x@example.org", displayName: "X", roles: ["ADMIN"] }),
    ).rejects.toBeInstanceOf(StaffError);
  });

  it("the last owner cannot be removed", async () => {
    const owner = await makeUser("solo@example.org", ["OWNER"]);
    await expect(revokeRole(db, { id: owner.id, roles: ["OWNER"] }, owner.id, "OWNER")).rejects.toMatchObject({ code: "last_owner" });
  });
});
