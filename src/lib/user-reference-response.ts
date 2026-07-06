import 'server-only';

import { CLERK_EMAIL_UNAVAILABLE, resolveClerkUserEmailMap } from '@/lib/clerk-user-display';

type JsonRecord = Record<string, unknown>;
type UserEmailResolver = (userIds: Iterable<string | null | undefined>) => Promise<Map<string, string>>;

const USER_ID_EMAIL_FIELDS: Record<string, string> = {
  authorClerkUserId: 'authorEmail',
  assignedToUserId: 'assignedToUserEmail',
  carerId: 'carerEmail',
  clerkUserId: 'clerkUserEmail',
  createdByUserId: 'createdByUserEmail',
  fromCarerId: 'fromCarerEmail',
  reviewedByUserId: 'reviewedByUserEmail',
  submittedByUserId: 'submittedByUserEmail',
  takenByUserId: 'takenByUserEmail',
  targetUserId: 'targetUserEmail',
  toCarerId: 'toCarerEmail',
  userId: 'userEmail',
  verifiedByUserId: 'verifiedByUserEmail',
};

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function collectUserIds(value: unknown, ids: Set<string>, parentKey?: string): void {
  if (Array.isArray(value)) {
    for (const item of value) collectUserIds(item, ids, parentKey);
    return;
  }

  if (!isRecord(value)) return;

  if (parentKey === 'carer' && typeof value.id === 'string' && value.id.trim()) {
    ids.add(value.id);
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === 'metadata') continue;
    if (typeof child === 'string' && USER_ID_EMAIL_FIELDS[key] && child.trim()) {
      ids.add(child);
      continue;
    }
    collectUserIds(child, ids, key);
  }
}

function emailFor(userId: string, emailByUserId: Map<string, string>): string {
  return emailByUserId.get(userId) ?? CLERK_EMAIL_UNAVAILABLE;
}

function enrichUserReferences(
  value: unknown,
  emailByUserId: Map<string, string>,
  parentKey?: string
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => enrichUserReferences(item, emailByUserId, parentKey));
  }

  if (!isRecord(value)) return value;

  const next: JsonRecord = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'metadata') {
      next[key] = child;
      continue;
    }

    const enrichedChild = enrichUserReferences(child, emailByUserId, key);
    if (!(key in next) || enrichedChild != null) {
      next[key] = enrichedChild;
    }

    const emailField = USER_ID_EMAIL_FIELDS[key];
    if (emailField && typeof child === 'string' && child.trim() && next[emailField] == null) {
      next[emailField] = emailFor(child, emailByUserId);
    }
  }

  if (
    parentKey === 'carer' &&
    typeof value.id === 'string' &&
    value.id.trim() &&
    next.email == null
  ) {
    next.email = emailFor(value.id, emailByUserId);
  }

  return next;
}

export async function addUserEmailsToResponse(
  data: unknown,
  resolveEmails: UserEmailResolver = resolveClerkUserEmailMap
): Promise<unknown> {
  const userIds = new Set<string>();
  collectUserIds(data, userIds);
  if (userIds.size === 0) return data;

  let emailByUserId: Map<string, string>;
  try {
    emailByUserId = await resolveEmails(userIds);
  } catch {
    emailByUserId = new Map([...userIds].map((id) => [id, CLERK_EMAIL_UNAVAILABLE]));
  }

  return enrichUserReferences(data, emailByUserId);
}
