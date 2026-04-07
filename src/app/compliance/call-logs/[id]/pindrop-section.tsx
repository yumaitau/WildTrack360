'use client';

import { PindropPanel, PindropResultCard } from '@/components/pindrop-panel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, MessageSquareOff } from 'lucide-react';

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
  callStatus: string;
  hasSmsPlan: boolean;
}

export function CallLogPindropSection({ callLogId, callerPhone, existingSession, callStatus, hasSmsPlan }: Props) {
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

  // Don't show send button for closed calls
  if (callStatus === 'CLOSED') return null;

  // No SMS plan — prompt user to contact sales
  if (!hasSmsPlan) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Location Request
          </CardTitle>
          <CardDescription>
            Send the caller an SMS with a link to share their location, contact details, and photos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-md border border-muted bg-muted/50 p-3">
            <MessageSquareOff className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              Your organisation doesn&apos;t have an SMS plan.{' '}
              <a href="mailto:support@wildtrack360.com.au" className="font-medium text-primary hover:underline">
                Contact us
              </a>{' '}
              to purchase an SMS plan and enable location request features.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PindropPanel
      callLogId={callLogId}
      callerPhone={callerPhone}
    />
  );
}
