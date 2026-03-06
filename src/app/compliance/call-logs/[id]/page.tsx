import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Calendar, ArrowLeft, Home, MapPin, User, Pencil } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from "next/navigation";

export default async function CallLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const callLog = await prisma.callLog.findFirst({
    where: { id, clerkOrganizationId: orgId },
    include: { animal: { select: { id: true, name: true, species: true } } },
  });

  if (!callLog) notFound();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance/call-logs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Call Details</h1>
            <p className="text-muted-foreground">
              Call from {callLog.callerName} — {new Date(callLog.dateTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge
            variant={callLog.status === 'OPEN' ? 'destructive' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {callLog.status}
          </Badge>
          <Link href={`/compliance/call-logs/${callLog.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caller Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Caller Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{callLog.callerName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Phone</div>
                <div className="font-medium">{callLog.callerPhone || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Email</div>
                <div className="font-medium">{callLog.callerEmail || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">How Call Came In</div>
                <div className="font-medium">{callLog.referrer || '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Call Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Date/Time</div>
                <div className="font-medium">
                  {new Date(callLog.dateTime).toLocaleDateString()} at{' '}
                  {new Date(callLog.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Species</div>
                <div className="font-medium">{callLog.species || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Reason</div>
                <div className="font-medium">
                  {callLog.reason ? <Badge variant="outline">{callLog.reason}</Badge> : '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Action Taken</div>
                <div className="font-medium">
                  {callLog.action ? <Badge variant="outline">{callLog.action}</Badge> : '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Outcome</div>
                <div className="font-medium">
                  {callLog.outcome ? <Badge variant="outline">{callLog.outcome}</Badge> : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Animal Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground">Address / Description</div>
                <div className="font-medium">{callLog.location || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Suburb</div>
                <div className="font-medium">{callLog.suburb || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Postcode</div>
                <div className="font-medium">{callLog.postcode || '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment & Tracking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Assignment & Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Taken By</div>
                <div className="font-medium">{callLog.takenByUserName || callLog.takenByUserId}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Assigned To</div>
                <div className="font-medium">{callLog.assignedToUserName || 'Unassigned'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Linked Animal</div>
                <div className="font-medium">
                  {callLog.animal ? (
                    <Link href={`/animals/${callLog.animal.id}`} className="text-primary hover:underline">
                      {callLog.animal.name} — {callLog.animal.species}
                    </Link>
                  ) : '—'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {callLog.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes / Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{callLog.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
