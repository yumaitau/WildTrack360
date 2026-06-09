'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Settings2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MemberDialog, type MemberFormValue } from './member-dialog';
import { TiersAdmin } from './tiers-admin';

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  memberNumber: string | null;
  status: 'ACTIVE' | 'LAPSED' | 'CANCELLED' | 'DECEASED';
  joinedAt: string;
  clerkUserId: string | null;
  clerkInvitationId: string | null;
  customFieldsJson?: Record<string, unknown> | null;
}

function portalState(m: Member): { label: string; className: string } {
  if (m.clerkUserId) return { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
  if (m.clerkInvitationId) return { label: 'Invited', className: 'bg-amber-500/10 text-amber-700 border-amber-200' };
  return { label: '—', className: 'bg-muted text-muted-foreground' };
}

const STATUS_COLORS: Record<Member['status'], string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  LAPSED: 'bg-amber-500/10 text-amber-700 border-amber-200',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
  DECEASED: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function MembersAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Member['status']>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await apiJson<Member[]>(`/api/members?${params}`);
      setMembers(data);
    } catch (err) {
      toast.error(`Failed to load members: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function handleSubmit(values: MemberFormValue) {
    try {
      if (editing) {
        await apiJson(`/api/members/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Member updated');
      } else {
        await apiJson('/api/members', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toast.success('Member created');
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleArchive(member: Member) {
    if (!confirm(`Archive ${member.firstName} ${member.lastName}?`)) return;
    try {
      await apiJson(`/api/members/${member.id}`, { method: 'DELETE' });
      toast.success('Member archived');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleInvite(member: Member) {
    try {
      await apiJson(`/api/members/${member.id}/invite`, { method: 'POST' });
      toast.success(`Portal invitation sent to ${member.email}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const filtered = useMemo(() => members, [members]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Members
          </h1>
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Member roster</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wildlife organisation supporters, donors, and paying members.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href="/admin/members/fields">
                    <Button variant="outline">
                      <Settings2 className="h-4 w-4 mr-2" /> Custom fields
                    </Button>
                  </Link>
                  <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> New member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email, or member number"
                      className="pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="LAPSED">Lapsed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="DECEASED">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Member #</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Portal</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No members yet. Create one to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {m.firstName} {m.lastName}
                            </TableCell>
                            <TableCell>{m.email}</TableCell>
                            <TableCell>{m.memberNumber ?? '—'}</TableCell>
                            <TableCell>
                              {[m.suburb, m.state, m.postcode].filter(Boolean).join(' ') || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[m.status]}>
                                {m.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={portalState(m).className}>
                                {portalState(m).label}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(m.joinedAt).toLocaleDateString('en-AU')}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const full = await apiJson<Member>(`/api/members/${m.id}`);
                                    setEditing(full);
                                    setDialogOpen(true);
                                  } catch (err) {
                                    toast.error(`Failed to load member: ${(err as Error).message}`);
                                  }
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleInvite(m)}
                              >
                                Invite
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(m)}
                              >
                                Archive
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tiers">
            <TiersAdmin />
          </TabsContent>
        </Tabs>

        <MemberDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
          initial={editing}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}
