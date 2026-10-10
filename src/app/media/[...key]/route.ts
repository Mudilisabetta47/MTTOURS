import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/server/db/client";

const ROOT = join(process.cwd(), "storage", "public");
const KEY = /^[a-z0-9-]+(\/[a-z0-9-]+)*\/[a-f0-9]{16}\.(webp|jpg|png)$/;

/**
 * Local driver for public media (trip photos). Only files registered as PUBLIC in the database are served;
 * keys contain the content hash, so responses are immutable.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!KEY.test(key)) return new Response("Not found", { status: 404 });
  const file = await db.storedFile.findUnique({ where: { bucket_key: { bucket: "public", key } }, select: { mimeType: true, visibility: true } });
  if (!file || file.visibility !== "PUBLIC") return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(join(ROOT, key));
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": file.mimeType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
