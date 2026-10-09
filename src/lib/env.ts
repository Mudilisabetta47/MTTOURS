import "server-only";
import { z } from "zod";

/**
 * Server environment, validated once at startup.
 * Nothing in here may ever be imported by a client component.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  TICKET_SIGNING_SECRET: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  BREVO_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET_PRIVATE: z.string().optional(),
  S3_BUCKET_PUBLIC: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Log variable names only, never values.
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${names}`);
  }
  if (parsed.data.APP_ENV === "production" && parsed.data.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
    throw new Error("Production must not run with a Stripe test key");
  }
  cached = parsed.data;
  return cached;
}
