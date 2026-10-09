import type { Db } from "@/server/db/client";
import { businessDayRange } from "@/lib/time";

export interface DashboardMetrics {
  newBookings7d: number;
  newInquiries7d: number;
  openQuotes: number;
  runsToday: number;
  runsTomorrow: number;
  vehiclesActive: number;
  vehiclesOnRunNow: number;
  ordersAwaitingPayment: number;
  /** Net of refunds, only from succeeded payments recorded in this system. */
  revenue30dCents: number;
  /** null when there is no departure on sale — no invented percentages. */
  utilisation30d: { sold: number; capacity: number } | null;
}

export async function getDashboardMetrics(db: Db, now = new Date()): Promise<DashboardMetrics> {
  const weekAgo = new Date(now.getTime() - 7 * 86400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86400_000);
  const in30 = new Date(now.getTime() + 30 * 86400_000);
  const today = businessDayRange(now, 0);
  const tomorrow = businessDayRange(now, 1);
  const activeRun = { status: { notIn: ["CANCELLED" as const] } };

  const [
    newBookings7d,
    newInquiries7d,
    openQuotes,
    runsToday,
    runsTomorrow,
    vehiclesActive,
    vehiclesOnRunNow,
    ordersAwaitingPayment,
    revenue,
    capacity,
  ] = await Promise.all([
    db.booking.count({ where: { createdAt: { gte: weekAgo }, status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.inquiry.count({ where: { createdAt: { gte: weekAgo } } }),
    db.quote.count({ where: { status: "SENT" } }),
    db.run.count({ where: { ...activeRun, startsAt: { lt: today.end }, endsAt: { gt: today.start } } }),
    db.run.count({ where: { ...activeRun, startsAt: { lt: tomorrow.end }, endsAt: { gt: tomorrow.start } } }),
    db.vehicle.count({ where: { status: "ACTIVE" } }),
    db.vehicleAssignment.count({ where: { status: "CONFIRMED", startsAt: { lte: now }, endsAt: { gt: now } } }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
    db.payment.aggregate({
      where: { status: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] }, succeededAt: { gte: monthAgo } },
      _sum: { amountCents: true, refundedCents: true },
    }),
    db.tripDeparture.aggregate({
      where: { status: "ON_SALE", departAt: { gte: now, lt: in30 } },
      _sum: { capacity: true, soldCount: true },
      _count: true,
    }),
  ]);

  return {
    newBookings7d,
    newInquiries7d,
    openQuotes,
    runsToday,
    runsTomorrow,
    vehiclesActive,
    vehiclesOnRunNow,
    ordersAwaitingPayment,
    revenue30dCents: (revenue._sum.amountCents ?? 0) - (revenue._sum.refundedCents ?? 0),
    utilisation30d:
      capacity._count > 0 && (capacity._sum.capacity ?? 0) > 0
        ? { sold: capacity._sum.soldCount ?? 0, capacity: capacity._sum.capacity ?? 0 }
        : null,
  };
}
