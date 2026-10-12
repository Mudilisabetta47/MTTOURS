import { NextResponse } from "next/server";
import { db } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth/session";
import { can } from "@/lib/rbac";
import { env } from "@/lib/env";
import { LiveError, PositionInput, recordPosition } from "@/server/live/tracking";

export const dynamic = "force-dynamic";

/** GPS point from the driver app. Session cookie + same-origin only; the service checks the run assignment. */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(env().APP_URL).host) return NextResponse.json({ error: "origin" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user || !can(user.roles, "driverapp.use")) return NextResponse.json({ error: "auth" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json" }, { status: 400 });
  }
  const parsed = PositionInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  try {
    const result = await recordPosition(db, user, parsed.data);
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof LiveError) return NextResponse.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
