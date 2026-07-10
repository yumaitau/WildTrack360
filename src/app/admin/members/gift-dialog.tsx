'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Tier {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
}

interface Props {
  member: { id: string; firstName: string; lastName: string } | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);

export function GiftDialog({ member, onOpenChange, onDone }: Props) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tierId, setTierId] = useState('');
  const [giftedBy, setGiftedBy] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!member) return;
    setTierId('');
    setGiftedBy('');
    fetch('/api/membership-tiers')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Tier[]) => setTiers(data))
      .catch(() => setTiers([]));
  }, [member]);

  async function grant() {
    if (!member || !tierId) {
      toast.error('Choose a tier');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/membership-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member.id, tierId, giftedBy: giftedBy || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to grant');
      toast.success('Membership granted');
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(member)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Gift membership{member ? ` to ${member.firstName} ${member.lastName}` : ''}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Grants an active membership without taking a payment — for gifts, prizes, grants and
            complimentary memberships. The recipient is emailed a welcome.
          </p>
          <div className="space-y-1.5">
            <Label>Tier <span className="text-destructive">*</span></Label>
            <Select value={tierId} onValueChange={setTierId}>
              <SelectTrigger><SelectValue placeholder="Choose a tier" /></SelectTrigger>
              <SelectContent>
                {tiers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} · {money(t.amountCents, t.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Gifted by (optional)</Label>
            <Input
              value={giftedBy}
              onChange={(e) => setGiftedBy(e.target.value)}
              placeholder="Leave blank for a complimentary membership"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={grant} disabled={saving || !tierId}>
            {saving ? 'Granting…' : 'Grant membership'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
