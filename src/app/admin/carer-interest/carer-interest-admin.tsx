'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, HeartHandshake } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type Status = 'NEW' | 'CONTACTED' | 'APPROVED' | 'DECLINED';

interface Interest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  experience: string | null;
  availability: string | null;
  message: string | null;
  status: Status;
  createdAt: string;
  memberId: string | null;
}

const STATUSES: Status[] = ['NEW', 'CONTACTED', 'APPROVED', 'DECLINED'];
const STATUS_VARIANT: Record<Status, 'default' | 'secondary' | 'outline'> = {
  NEW: 'default',
  CONTACTED: 'secondary',
  APPROVED: 'outline',
  DECLINED: 'outline',
};

export function CarerInterestAdmin() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/carer-interest');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to load');
      const data = await res.json();
      setInterests(data.interests as Interest[]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Status) {
    setInterests((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    try {
      const res = await fetch('/api/admin/carer-interest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update');
    } catch (err) {
      toast.error((err as Error).message);
      load();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <HeartHandshake className="h-6 w-6" /> Carer interest
          </h1>
          <Link href="/admin/members">
            <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Members</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Members interested in becoming carers</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Follow up, then mark each applicant as contacted, approved or declined. Approved
              applicants can be onboarded as carers in the wildlife app.
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading…</p>
            ) : interests.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No applications yet.</p>
            ) : (
              <ul className="space-y-3">
                {interests.map((i) => (
                  <li key={i.id} className="rounded-md border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{i.name}</span>
                          <Badge variant={STATUS_VARIANT[i.status]}>{i.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {i.email}{i.phone ? ` · ${i.phone}` : ''}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(i.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                      <Select value={i.status} onValueChange={(v) => setStatus(i.id, v as Status)}>
                        <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {(i.availability || i.experience || i.message) && (
                      <dl className="mt-3 space-y-1.5 text-sm">
                        {i.availability && (
                          <div><dt className="text-xs text-muted-foreground">Availability</dt><dd>{i.availability}</dd></div>
                        )}
                        {i.experience && (
                          <div><dt className="text-xs text-muted-foreground">Experience</dt><dd>{i.experience}</dd></div>
                        )}
                        {i.message && (
                          <div><dt className="text-xs text-muted-foreground">Message</dt><dd>{i.message}</dd></div>
                        )}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
