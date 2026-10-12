import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Db } from "@/server/db/client";
import { audit } from "@/server/audit";
import { nextNumber } from "@/server/numbering";
import { findOrderForGuest } from "@/server/booking/checkout";
import { crowMeters } from "@/server/catalog/destinations";

/**
 * Live tracking. Positions come only from the assigned driver's phone during an active run
 * (or later from vehicle telematics) – never simulated. Customers see them only for their own
 * paid booking and only while the run is in progress.
 */

export class LiveError extends Error {}

/** older than this the position is shown as outdated instead of "live" */
export const STALE_AFTER_MS = 10 * 60_000;
const MIN_INTERVAL_MS = 5_000;

type User = { id: string; displayName: string };

async function driverRun(db: Db, user: User, runId: string) {
  const driver = await db.driver.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!driver) throw new LiveError("Ihr Konto ist keinem Fahrerprofil zugeordnet.");
  const run = await db.run.findUnique({
    where: { id: runId },
    include: {
      drivers: { where: { driverId: driver.id, status: { not: "CANCELLED" } } },
      vehicles: { where: { status: { not: "CANCELLED" } }, include: { vehicle: true } },
    },
  });
  if (!run || !run.drivers.length) throw new LiveError("Diese Fahrt ist Ihnen nicht zugeordnet.");
  return { run, driver };
}

export async function startRun(db: Db, user: User, runId: string) {
  const { run } = await driverRun(db, user, runId);
  if (run.status === "COMPLETED" || run.status === "CANCELLED") throw new LiveError("Diese Fahrt ist bereits beendet.");
  if (!run.vehicles.length) throw new LiveError("Der Fahrt ist kein Fahrzeug zugeordnet – bitte die Disposition anrufen.");
  if (run.status !== "IN_PROGRESS") {
    await db.run.update({ where: { id: runId }, data: { status: "IN_PROGRESS" } });
    await db.operationalEvent.create({ data: { runId, type: "RUN_STARTED", payload: {}, occurredAt: new Date(), reportedById: user.id, source: "DRIVER_APP", clientEventId: randomUUID() } });
    await audit(db, { actorUserId: user.id, action: "run.start", entityType: "Run", entityId: runId });
  }
}

export async function endRun(db: Db, user: User, runId: string) {
  const { run } = await driverRun(db, user, runId);
  if (run.status !== "IN_PROGRESS") throw new LiveError("Die Fahrt läuft nicht.");
  await db.run.update({ where: { id: runId }, data: { status: "COMPLETED" } });
  await db.operationalEvent.create({ data: { runId, type: "RUN_COMPLETED", payload: {}, occurredAt: new Date(), reportedById: user.id, source: "DRIVER_APP", clientEventId: randomUUID() } });
  await audit(db, { actorUserId: user.id, action: "run.complete", entityType: "Run", entityId: runId });
}

export const PositionInput = z.object({
  runId: z.string().min(1).max(64),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(5000).nullable().optional(),
  speed: z.number().min(0).max(80).nullable().optional(), // m/s from the browser
  heading: z.number().min(0).max(360).nullable().optional(),
  at: z.number().int(), // epoch ms from the device
});

export async function recordPosition(db: Db, user: User, input: z.infer<typeof PositionInput>, now = new Date()): Promise<"stored" | "throttled"> {
  const { run } = await driverRun(db, user, input.runId);
  if (run.status !== "IN_PROGRESS") throw new LiveError("Bitte zuerst „Fahrt starten“.");
  const vehicle = run.vehicles[0]?.vehicle;
  if (!vehicle) throw new LiveError("Kein Fahrzeug zugeordnet.");
  const at = new Date(input.at);
  if (at.getTime() > now.getTime() + 60_000 || at.getTime() < now.getTime() - 10 * 60_000) throw new LiveError("Zeitstempel des Geräts stimmt nicht.");
  const last = await db.vehiclePosition.findFirst({ where: { runId: run.id }, orderBy: { recordedAt: "desc" }, select: { recordedAt: true } });
  if (last && at.getTime() - last.recordedAt.getTime() < MIN_INTERVAL_MS) return "throttled";
  await db.vehiclePosition.create({
    data: {
      vehicleId: vehicle.id,
      runId: run.id,
      latitude: input.lat,
      longitude: input.lng,
      accuracyM: input.accuracy ?? null,
      speedKmh: input.speed != null ? Math.round(input.speed * 3.6 * 10) / 10 : null,
      heading: input.heading ?? null,
      source: "DRIVER_APP",
      recordedAt: at,
    },
  });
  return "stored";
}

// ── customer view ──────────────────────────────────────────────────────

export type LiveView =
  | { state: "none" } // no tracking for this booking (not paid, no run, not started)
  | { state: "finished" }
  | {
      state: "live" | "stale" | "waiting";
      vehicle: { lat: number; lng: number; at: string; accuracyM: number | null; speedKmh: number | null } | null;
      stop: { name: string; city: string; lat: number | null; lng: number | null; plannedAt: string } | null;
      /** straight-line distance bus → own boarding stop; never an ETA */
      crowMeters: number | null;
    };

export async function liveForOrder(db: Db, orderId: string, token: string, now = new Date()): Promise<LiveView> {
  const order = await findOrderForGuest(db, orderId, token);
  if (!order || (order.status !== "PAID" && order.status !== "PARTIALLY_REFUNDED")) return { state: "none" };
  const booking = order.bookings[0];
  if (!booking) return { state: "none" };
  const run = await db.run.findUnique({ where: { departureId: booking.departureId }, select: { id: true, status: true } });
  if (!run) return { state: "none" };
  if (run.status === "COMPLETED") return { state: "finished" };
  if (run.status !== "IN_PROGRESS") return { state: "none" };
  const pos = await db.vehiclePosition.findFirst({ where: { runId: run.id }, orderBy: { recordedAt: "desc" } });
  const bs = booking.passengers[0]?.boardingStop;
  const stop = bs ? { name: bs.stop.name, city: bs.stop.city, lat: bs.stop.latitude, lng: bs.stop.longitude, plannedAt: bs.plannedAt.toISOString() } : null;
  if (!pos) return { state: "waiting", vehicle: null, stop, crowMeters: null };
  const vehicle = { lat: pos.latitude, lng: pos.longitude, at: pos.recordedAt.toISOString(), accuracyM: pos.accuracyM, speedKmh: pos.speedKmh };
  const dist = stop?.lat != null && stop.lng != null ? crowMeters({ lat: pos.latitude, lng: pos.longitude }, { lat: stop.lat, lng: stop.lng }) : null;
  return { state: now.getTime() - pos.recordedAt.getTime() > STALE_AFTER_MS ? "stale" : "live", vehicle, stop, crowMeters: dist };
}

// ── dispatch-lite for the control room ─────────────────────────────────

export const RunCreateInput = z.object({
  departureId: z.string().min(1).max(64),
  vehicleId: z.string().min(1).max(64),
  driverId: z.string().min(1).max(64),
});

export async function createRunForDeparture(db: Db, actor: User, data: z.infer<typeof RunCreateInput>) {
  const dep = await db.tripDeparture.findUnique({ where: { id: data.departureId }, include: { trip: true, stops: { orderBy: { sequence: "asc" }, include: { stop: true } }, run: true } });
  if (!dep) throw new LiveError("Termin nicht gefunden.");
  if (dep.run) throw new LiveError("Für diesen Termin gibt es bereits eine Fahrt.");
  const vehicle = await db.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new LiveError("Fahrzeug nicht gefunden.");
  const seats = dep.soldCount + dep.heldCount;
  if (vehicle.seats < dep.capacity) throw new LiveError(`Das Fahrzeug hat ${vehicle.seats} Plätze, der Termin ist für ${dep.capacity} angelegt.`);
  const startsAt = new Date(dep.departAt.getTime() - 60 * 60_000);
  const endsAt = dep.returnAt ?? new Date(dep.departAt.getTime() + Math.max(1, dep.trip.durationDays) * 24 * 3600_000);
  try {
    return await db.$transaction(async (tx) => {
      const number = await nextNumber(tx, "RUN", dep.departAt.getUTCFullYear());
      const run = await tx.run.create({
        data: {
          number,
          kind: "SCHEDULED_DEPARTURE",
          status: "CONFIRMED",
          departureId: dep.id,
          title: dep.trip.title,
          startsAt,
          endsAt,
          originText: dep.stops[0]?.stop.name ?? "–",
          destinationText: dep.trip.destination,
          requiredSeats: Math.max(seats, 1),
          isCrossBorder: dep.trip.countryCode !== "DE",
          vehicles: { create: { vehicleId: vehicle.id, startsAt, endsAt, status: "CONFIRMED" } },
          drivers: { create: { driverId: data.driverId, startsAt, endsAt, status: "CONFIRMED" } },
        },
      });
      await audit(tx, { actorUserId: actor.id, action: "run.create", entityType: "Run", entityId: run.id, after: { number, departure: dep.code, vehicle: vehicle.licensePlate } });
      return run;
    });
  } catch (e) {
    // exclusion constraint: the vehicle is already booked in that period
    if (String((e as Error).message).includes("exclusion") || String((e as Error).message).includes("23P01")) throw new LiveError("Das Fahrzeug ist in diesem Zeitraum schon verplant.");
    throw e;
  }
}

export const VehicleInput = z.object({
  internalNumber: z.string().trim().min(1).max(20),
  licensePlate: z.string().trim().toUpperCase().min(4).max(15),
  manufacturer: z.string().trim().min(2).max(40),
  model: z.string().trim().min(1).max(60),
  seats: z.coerce.number().int().min(8).max(90),
  vehicleClass: z.enum(["KLEINBUS", "MIDIBUS", "REISEBUS", "DOPPELDECKER"]),
});

export async function createVehicle(db: Db, actor: User, data: z.infer<typeof VehicleInput>) {
  const exists = await db.vehicle.findFirst({ where: { OR: [{ licensePlate: data.licensePlate }, { internalNumber: data.internalNumber }] } });
  if (exists) throw new LiveError("Kennzeichen oder Wagennummer ist schon vergeben.");
  const v = await db.vehicle.create({ data: { ...data, equipment: [] } });
  await audit(db, { actorUserId: actor.id, action: "vehicle.create", entityType: "Vehicle", entityId: v.id, after: data });
  return v;
}

/** A driver profile for a user account with the DRIVER role (accounts are created under Benutzer & Rollen). */
export async function createDriverProfile(db: Db, actor: User, userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, include: { roles: true, driver: true } });
  if (!u || !u.roles.some((r) => r.role === "DRIVER")) throw new LiveError("Das Konto hat keine Fahrer-Rolle.");
  if (u.driver) throw new LiveError("Für dieses Konto gibt es bereits ein Fahrerprofil.");
  const [firstName, ...rest] = u.displayName.split(" ");
  const d = await db.driver.create({ data: { userId: u.id, firstName: firstName ?? u.displayName, lastName: rest.join(" ") || "–", email: u.email } });
  await audit(db, { actorUserId: actor.id, action: "driver.create", entityType: "Driver", entityId: d.id });
  return d;
}

export async function activeRuns(db: Db, now = new Date()) {
  const runs = await db.run.findMany({
    where: { OR: [{ status: "IN_PROGRESS" }, { status: { in: ["CONFIRMED", "DISPATCHED"] }, startsAt: { lte: new Date(now.getTime() + 7 * 24 * 3600_000) } }] },
    orderBy: { startsAt: "asc" },
    include: {
      vehicles: { where: { status: { not: "CANCELLED" } }, include: { vehicle: true } },
      drivers: { where: { status: { not: "CANCELLED" } }, include: { driver: true } },
      departure: { select: { code: true, soldCount: true } },
      positions: { orderBy: { recordedAt: "desc" }, take: 1 },
    },
  });
  return runs.map((r) => {
    const p = r.positions[0];
    return {
      ...r,
      last: p ? { lat: p.latitude, lng: p.longitude, at: p.recordedAt, accuracyM: p.accuracyM, speedKmh: p.speedKmh, stale: now.getTime() - p.recordedAt.getTime() > STALE_AFTER_MS } : null,
    };
  });
}
