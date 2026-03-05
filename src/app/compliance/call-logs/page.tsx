import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Phone, Calendar, Plus, ArrowLeft, Home, MapPin, User, Settings } from "lucide-react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@/lib/prisma';
import { redirect } from "next/navigation";
import { ViewButton } from "@/components/view-button";

export default async function CallLogsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const callLogs = await prisma.callLog.findMany({
    where: { clerkOrganizationId: orgId },
    include: { animal: { select: { id: true, name: true, species: true } } },
    orderBy: { dateTime: 'desc' },
  });

  const totalCalls = callLogs.length;
  const openCalls = callLogs.filter((c) => c.status === 'OPEN').length;
  const closedCalls = callLogs.filter((c) => c.status === 'CLOSED').length;
  const last7Days = callLogs.filter((c) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(c.dateTime) >= sevenDaysAgo;
  }).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance">
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
            <h1 className="text-3xl font-bold">Call Log</h1>
            <p className="text-muted-foreground">
              Record and track incoming wildlife rescue calls
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/compliance/call-logs/lookups">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Lists
            </Button>
          </Link>
          <Link href="/compliance/call-logs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Call
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalCalls}</div>
            <div className="text-sm text-muted-foreground">Total Calls</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{openCalls}</div>
            <div className="text-sm text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{closedCalls}</div>
            <div className="text-sm text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{last7Days}</div>
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Call Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Calls</CardTitle>
          <CardDescription>
            Complete log of all incoming wildlife rescue calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Time</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callLogs.map((call) => (
                <TableRow key={call.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div>{new Date(call.dateTime).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(call.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{call.callerName}</div>
                        {call.callerPhone && (
                          <div className="text-xs text-muted-foreground">{call.callerPhone}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{call.species || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    {call.reason ? (
                      <Badge variant="outline" className="text-xs">{call.reason}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.location || call.suburb ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{call.suburb || call.location}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={call.status === 'OPEN' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {call.assignedToUserName || <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    <ViewButton href={`/compliance/call-logs/${call.id}`} />
                  </TableCell>
                </TableRow>
              ))}
              {callLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No call logs found. Click &quot;New Call&quot; to record a call.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
