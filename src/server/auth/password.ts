import { hash, verify } from "@node-rs/argon2";

// Algorithm.Argon2id from @node-rs/argon2 (const enum; inlined for isolatedModules).
const ARGON2ID = 2;

// OWASP recommendation for argon2id (2024+): m=19 MiB, t=2, p=1.
const OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export const PASSWORD_MIN_LENGTH = 12;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`;
  if (password.length > 256) return "Höchstens 256 Zeichen.";
  if (new Set(password).size < 6) return "Das Passwort ist zu gleichförmig.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const problem = validatePasswordStrength(password);
  if (problem) throw new Error(problem);
  return hash(password, OPTIONS);
}

// Used when the account does not exist so that timing does not reveal valid e-mail addresses.
let dummyHash: Promise<string> | undefined;

export async function verifyPassword(storedHash: string | null | undefined, password: string): Promise<boolean> {
  if (!storedHash) {
    dummyHash ??= hash("timing-equaliser-not-a-real-password", OPTIONS);
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}
