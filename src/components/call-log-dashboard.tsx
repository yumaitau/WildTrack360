"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Phone, Plus, Calendar, User, MapPin } from 'lucide-react';
import { useOrganization } from '@clerk/nextjs';
import { ViewButton } from '@/components/view-button';

interface CallLog {
  id: string;
  dateTime: string;
  status: string;
  callerName: string;
  callerPhone: string | null;
  species: string | null;
  reason: string | null;
  location: string | null;
  suburb: string | null;
  assignedToUserName: string | null;
  takenByUserName: string | null;
}

export function CallLogDashboard() {
  const { organization } = useOrganization();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    const fetchCallLogs = async () => {
      try {
        const res = await fetch(`/api/call-logs?orgId=${organization.id}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setCallLogs(data);
      } catch (error) {
        console.error('Error fetching call logs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCallLogs();
  }, [organization]);

  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      total: callLogs.length,
      open: callLogs.filter(c => c.status === 'OPEN').length,
      closed: callLogs.filter(c => c.status === 'CLOSED').length,
      last7Days: callLogs.filter(c => new Date(c.dateTime) >= sevenDaysAgo).length,
      today: callLogs.filter(c => new Date(c.dateTime) >= today).length,
    };
  }, [callLogs]);

  const recentCalls = useMemo(() => callLogs.slice(0, 5), [callLogs]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Call Log
        </h2>
        <p className="text-muted-foreground">Loading call log data...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md p-4 sm:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          Call Log
        </h2>
        <div className="flex gap-2">
          <Link href="/compliance/call-logs">
            <Button size="sm" variant="secondary">View All Calls</Button>
          </Link>
          <Link href="/compliance/call-logs/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Call
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total Calls</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.open}</div>
            <div className="text-sm text-muted-foreground">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
            <div className="text-sm text-muted-foreground">Closed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.today}</div>
            <div className="text-sm text-muted-foreground">Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.last7Days}</div>
            <div className="text-sm text-muted-foreground">Last 7 Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls Table */}
      {recentCalls.length > 0 ? (
        <div className="overflow-x-auto -mx-4 sm:-mx-0">
        <Table className="min-w-[700px]">
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
            {recentCalls.map((call) => (
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
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No call logs yet. Click &quot;New Call&quot; to record a call.</p>
        </div>
      )}
    </div>
  );
}
