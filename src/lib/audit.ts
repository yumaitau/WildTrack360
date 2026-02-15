'server-only';

import { prisma } from './prisma';
import type { AuditAction } from '@prisma/client';
import { Prisma } from '@prisma/client';

interface AuditLogParams {
  userId: string;
  orgId: string;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Write an audit log entry. Fires asynchronously and never throws —
 * a failed audit write must not break the request that triggered it.
 */
export function logAudit(params: AuditLogParams): void {
  prisma.auditLog
    .create({
      data: {
        userId: params.userId,
        orgId: params.orgId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    })
    .catch((err) => {
      console.error('Audit log write failed:', err);
    });
}
