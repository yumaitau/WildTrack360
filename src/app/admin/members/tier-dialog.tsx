'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export interface TierFormValue {
  name: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  billingInterval: 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  gstHandling: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE';
  active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: (Partial<TierFormValue> & { id?: string }) | null;
  onSubmit: (values: TierFormValue) => void | Promise<void>;
}

const EMPTY: TierFormValue = {
  name: '',
  description: '',
  amountCents: 0,
  currency: 'AUD',
  billingInterval: 'ANNUAL',
  gstHandling: 'NONE',
  active: true,
};

export function TierDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [values, setValues] = useState<TierFormValue>(EMPTY);
  const [amountDisplay, setAmountDisplay] = useState('0.00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const merged: TierFormValue = { ...EMPTY, ...(initial ?? {}) };
      setValues(merged);
      setAmountDisplay((merged.amountCents / 100).toFixed(2));
    }
  }, [open, initial]);

  function set<K extends keyof TierFormValue>(key: K, v: TierFormValue[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function handleAmountChange(raw: string) {
    setAmountDisplay(raw);
    const parsed = Number.parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      set('amountCents', Math.round(parsed * 100));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = Boolean(initial?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tier' : 'New tier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input value={values.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={values.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amountDisplay}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={values.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Billing interval</Label>
              <Select value={values.billingInterval} onValueChange={(v) => set('billingInterval', v as TierFormValue['billingInterval'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_OFF">One-off</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                  <SelectItem value="LIFETIME">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>GST handling</Label>
              <Select value={values.gstHandling} onValueChange={(v) => set('gstHandling', v as TierFormValue['gstHandling'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="INCLUSIVE">GST inclusive</SelectItem>
                  <SelectItem value="EXCLUSIVE">GST exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={values.active} onCheckedChange={(v) => set('active', v)} />
            <Label className="cursor-pointer">Active (available at checkout)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create tier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
