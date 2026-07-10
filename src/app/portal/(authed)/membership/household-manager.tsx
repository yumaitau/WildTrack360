'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HouseholdMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clerkUserId: string | null;
}

export function HouseholdManager() {
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/household');
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members as HouseholdMember[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/portal/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      toast.success('Household member added — they can sign in with their email');
      setForm({ firstName: '', lastName: '', email: '' });
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this person from your household?')) return;
    try {
      const res = await fetch(`/api/portal/household?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to remove');
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Household members
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add the people in your household — they&apos;re covered by your membership and get their own
          digital card. They can sign in to the portal using their email.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length > 0 && (
          <ul className="divide-y rounded-md border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium">{m.firstName} {m.lastName}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.email}{m.clerkUserId ? '' : ' · not yet signed in'}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(m.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="grid gap-3 sm:grid-cols-3 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="hh-first">First name</Label>
            <Input id="hh-first" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hh-last">Last name</Label>
            <Input id="hh-last" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </div>
          <div className="space-y-1.5 sm:col-span-3 sm:flex sm:items-end sm:gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="hh-email">Email</Label>
              <Input id="hh-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <Button type="submit" disabled={adding} className="mt-2 sm:mt-0">
              <Plus className="h-4 w-4 mr-2" /> {adding ? 'Adding…' : 'Add member'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
