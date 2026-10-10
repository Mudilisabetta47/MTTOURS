import "server-only";
import QRCode from "qrcode";
import { hmac, safeEqual } from "@/server/auth/tokens";

const PREFIX = "MT1";

function secret(): string {
  const s = process.env.TICKET_SIGNING_SECRET;
  if (!s || s.length < 32) throw new Error("TICKET_SIGNING_SECRET missing");
  return s;
}

/** QR payload: version.tokenId.signature – verifiable offline by the driver app (phase 6). */
export function ticketPayload(qrTokenId: string): string {
  return `${PREFIX}.${qrTokenId}.${hmac(secret(), `${PREFIX}.${qrTokenId}`).slice(0, 22)}`;
}

export function verifyTicketPayload(payload: string): string | null {
  const [v, id, sig] = payload.split(".");
  if (v !== PREFIX || !id || !sig) return null;
  return safeEqual(sig, hmac(secret(), `${PREFIX}.${id}`).slice(0, 22)) ? id : null;
}

export async function ticketQrSvg(qrTokenId: string): Promise<string> {
  return QRCode.toString(ticketPayload(qrTokenId), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#050607", light: "#ffffff" } });
}
