'use client';

import { PindropPanel, PindropResultCard } from '@/components/pindrop-panel';

interface Props {
  callLogId: string;
  callerPhone: string;
  existingSession: {
    id: string;
    status: string;
    callerName: string | null;
    callerEmail: string | null;
    callerPhone: string | null;
    lat: number | null;
    lng: number | null;
    address: string | null;
    photoUrls: string[];
    callerNotes: string | null;
    submittedAt: Date | string | null;
    createdAt: Date | string;
  } | null;
}

export function CallLogPindropSection({ callLogId, callerPhone, existingSession }: Props) {
  if (existingSession?.status === 'SUBMITTED') {
    // Serialize dates to strings for the client component
    const serialized = {
      ...existingSession,
      status: existingSession.status as 'PENDING' | 'SUBMITTED' | 'EXPIRED',
      submittedAt: existingSession.submittedAt ? new Date(existingSession.submittedAt).toISOString() : null,
      createdAt: new Date(existingSession.createdAt).toISOString(),
    };
    return <PindropResultCard session={serialized} />;
  }

  return (
    <PindropPanel
      callLogId={callLogId}
      callerPhone={callerPhone}
    />
  );
}
