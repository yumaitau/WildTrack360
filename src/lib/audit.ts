'server-only';

import { prisma } from './prisma';
import type { AuditAction } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { clerkClient } from '@clerk/nextjs/server';

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
 *
 * Resolves the user's name and email from Clerk so audit entries
 * are human-readable without a subsequent lookup.
 */
export function logAudit(params: AuditLogParams): void {
  resolveUserAndLog(params).catch((err) => {
    console.error('Audit log write failed:', err);
  });
}

async function resolveUserAndLog(params: AuditLogParams): Promise<void> {
  let userName: string | null = null;
  let userEmail: string | null = null;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(params.userId);
    userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    userEmail = user.emailAddresses?.[0]?.emailAddress || null;
  } catch {
    // If Clerk lookup fails, proceed without user details
  }

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      userName,
      userEmail,
      orgId: params.orgId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: (params.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    },
  });
}
