/**
 * Local development only: one clearly marked test departure so the booking flow can be clicked through.
 * Refuses every database whose name does not end in "_dev". Codes start with "DEMO-" and the UI labels them.
 *   npx tsx scripts/seed-demo-departure.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { tzOffsetMinutes } from "../src/lib/time.ts";

try {
  process.loadEnvFile();
} catch {
  // env from outside
}
const url = process.env.DATABASE_URL ?? "";
const name = new URL(url).pathname.slice(1);
if (!name.endsWith("_dev")) throw new Error(`Refusing to seed demo data into "${name}" (only *_dev).`);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const berlin = (date: string, time: string) => {
  const g = new Date(`${date}T${time}:00Z`);
  return new Date(g.getTime() - tzOffsetMinutes(g) * 60000);
};

try {
  const trip = await db.trip.findUniqueOrThrow({ where: { slug: "kopenhagen" }, include: { pickups: { include: { stop: true }, orderBy: { sort: "asc" } } } });
  const date = "2027-05-14";
  const times = ["13:00", "15:00", "16:15"]; // test values
  const code = `DEMO-KOPENHAGEN-${date}`;
  const dep = await db.tripDeparture.upsert({
    where: { code },
    create: { tripId: trip.id, code, departAt: berlin(date, times[0]!), returnAt: berlin("2027-05-16", "22:00"), status: "ON_SALE", capacity: 50, notes: "Testtermin – nur lokale Entwicklung" },
    update: { status: "ON_SALE" },
  });
  await db.departureFare.upsert({
    where: { departureId_code: { departureId: dep.id, code: "BASIC" } },
    create: { departureId: dep.id, code: "BASIC", name: "Basic", priceCents: 19900, sort: 0, conditions: { features: ["Handgepäck bis 8 kg", "Standard-Sitzplatz"] } },
    update: {},
  });
  await db.departureFare.upsert({
    where: { departureId_code: { departureId: dep.id, code: "SMART" } },
    create: { departureId: dep.id, code: "SMART", name: "Smart", priceCents: 22900, sort: 1, conditions: { features: ["Handgepäck bis 8 kg", "1 Koffer bis 20 kg"], recommended: true } },
    update: {},
  });
  if ((await db.departureStop.count({ where: { departureId: dep.id } })) === 0) {
    for (const [i, p] of trip.pickups.entries()) {
      await db.departureStop.create({
        data: { departureId: dep.id, stopId: p.stopId, sequence: i + 1, plannedAt: berlin(date, p.localTime ?? times[i] ?? "13:00"), platform: p.platform, surchargeCents: p.surchargeCents },
      });
    }
  }
  console.log(`Demo departure ready: /buchung/${code}`);
} finally {
  await db.$disconnect();
}
