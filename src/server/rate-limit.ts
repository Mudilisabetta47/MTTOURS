import type { Db, Tx } from "@/server/db/client";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
}

/**
 * Fixed-window rate limiter backed by Postgres (works across instances without Redis).
 * Can be swapped for Redis later behind the same signature.
 */
export async function hitRateLimit(
  db: Db | Tx,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "windowStart", "count")
    VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."windowStart" < now() - make_interval(secs => ${windowSeconds})
                     THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimitBucket"."windowStart" < now() - make_interval(secs => ${windowSeconds})
                     THEN now() ELSE "RateLimitBucket"."windowStart" END
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  return { allowed: count <= limit, count, limit };
}

/** Current count in the active window without incrementing it. */
export async function peekRateLimit(db: Db | Tx, key: string, windowSeconds: number): Promise<number> {
  const rows = await db.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "RateLimitBucket"
     WHERE "key" = ${key} AND "windowStart" >= now() - make_interval(secs => ${windowSeconds})`;
  return Number(rows[0]?.count ?? 0);
}
