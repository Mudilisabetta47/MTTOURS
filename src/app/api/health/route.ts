import { NextResponse } from "next/server";
import { db } from "@/server/db/client";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness. Reveals no secrets, versions or customer data —
 * only whether the app can reach its database and the migration count.
 */
export async function GET() {
  const started = Date.now();
  try {
    const rows = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    return NextResponse.json(
      { status: "ok", database: "up", migrations: Number(rows[0]?.n ?? 0), latencyMs: Date.now() - started },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
