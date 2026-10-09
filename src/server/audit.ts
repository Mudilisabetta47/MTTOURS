import type { Prisma } from "@/generated/prisma/client";
import type { Db, Tx } from "@/server/db/client";

export interface AuditEntry {
  actorUserId?: string | null;
  actorLabel?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  reason?: string;
  ipHash?: string | null;
}

/**
 * Write an audit entry. For business-critical changes pass the transaction client
 * so the entry commits or rolls back together with the change.
 */
export async function audit(db: Db | Tx, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: entry.actorUserId ?? null,
      actorLabel: entry.actorLabel ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      before: entry.before,
      after: entry.after,
      reason: entry.reason ?? null,
      ipHash: entry.ipHash ?? null,
    },
  });
}
