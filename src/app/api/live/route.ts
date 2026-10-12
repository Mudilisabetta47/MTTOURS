import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { liveForOrder } from "@/server/live/tracking";

export const dynamic = "force-dynamic";

/** Live state for one paid booking; the guest token is the only key (same as the booking link). */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const o = (u.searchParams.get("o") ?? "").slice(0, 64);
  const t = (u.searchParams.get("t") ?? "").slice(0, 200);
  const view = await liveForOrder(db, o, t);
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
