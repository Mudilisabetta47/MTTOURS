import { z } from "zod";

/** Structured editorial content. No raw HTML anywhere in the CMS. */
export const ContentBlock = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal("h2"), text: z.string().min(1).max(200) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1).max(500)).min(1).max(40) }),
]);
export type ContentBlock = z.infer<typeof ContentBlock>;

export const ContentBlocks = z.array(ContentBlock).max(80);

export function parseBlocks(value: unknown): ContentBlock[] {
  const r = ContentBlocks.safeParse(value);
  return r.success ? r.data : [];
}
