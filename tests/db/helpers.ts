import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { assertTestDatabase } from "./safety";

export function testDb(): PrismaClient {
  const url = assertTestDatabase(process.env.TEST_DATABASE_URL);
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 40 }) });
}

/** Empty all application tables (keeps the migration history). Test DB only. */
export async function truncateAll(db: PrismaClient): Promise<void> {
  assertTestDatabase(process.env.TEST_DATABASE_URL);
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  // Append-only triggers block DELETE but not TRUNCATE (statement-level), which is what we want in tests.
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

export async function seedDeparture(db: PrismaClient, opts: { capacity: number; status?: "ON_SALE" | "DRAFT" }) {
  const trip = await db.trip.create({
    data: {
      slug: `test-${Math.random().toString(36).slice(2, 10)}`,
      title: "Testreise",
      productType: "PACKAGE_TOUR",
      countryCode: "HR",
      destination: "Testziel",
      summary: "Nur für Tests",
      description: [],
      durationDays: 7,
    },
  });
  return db.tripDeparture.create({
    data: {
      tripId: trip.id,
      code: `T-${Math.random().toString(36).slice(2, 10)}`,
      departAt: new Date(Date.now() + 30 * 86400_000),
      capacity: opts.capacity,
      status: opts.status ?? "ON_SALE",
    },
  });
}
