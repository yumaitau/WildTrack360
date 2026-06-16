'use client';

import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { netAfterFeesCents, COVER_FEE_BPS } from '@/lib/fees';

export interface TierFormValue {
  name: string;
  description?: string | null;
  amountCents: number;
  currency: string;
  billingInterval: 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  gstHandling: 'NONE' | 'INCLUSIVE' | 'EXCLUSIVE';
  benefits: string[];
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
  benefits: [],
  active: true,
};

const INTERVAL_OPTIONS: { value: TierFormValue['billingInterval']; label: string }[] = [
  { value: 'ANNUAL', label: 'Annual — auto-renews each year' },
  { value: 'MONTHLY', label: 'Monthly — auto-renews each month' },
  { value: 'ONE_OFF', label: 'One-off — one year, no auto-renew' },
  { value: 'LIFETIME', label: 'Lifetime — single payment' },
];

const FEE_PERCENT = (COVER_FEE_BPS / 100).toFixed(1);

export function TierDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [values, setValues] = useState<TierFormValue>(EMPTY);
  const [amountDisplay, setAmountDisplay] = useState('0.00');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const merged: TierFormValue = {
        ...EMPTY,
        ...(initial ?? {}),
        benefits: initial?.benefits ?? [],
      };
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

  function updateBenefit(i: number, text: string) {
    setValues((prev) => {
      const benefits = [...prev.benefits];
      benefits[i] = text;
      return { ...prev, benefits };
    });
  }

  function addBenefit() {
    setValues((prev) => ({ ...prev, benefits: [...prev.benefits, ''] }));
  }

  function removeBenefit(i: number) {
    setValues((prev) => ({ ...prev, benefits: prev.benefits.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        ...values,
        benefits: values.benefits.map((b) => b.trim()).filter(Boolean),
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = Boolean(initial?.id);
  const net = netAfterFeesCents(values.amountCents);
  const safeCurrency = /^[A-Z]{3}$/.test(values.currency) ? values.currency : 'AUD';
  const fmt = (cents: number) =>
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: safeCurrency }).format(
      cents / 100
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit tier' : 'New tier'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>
              Name <span className="text-destructive">*</span>
            </Label>
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
              <Label>
                Amount <span className="text-destructive">*</span>
              </Label>
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
              <Input
                value={values.currency}
                onChange={(e) => set('currency', e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Billing</Label>
              <Select
                value={values.billingInterval}
                onValueChange={(v) => set('billingInterval', v as TierFormValue['billingInterval'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVAL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>GST handling</Label>
              <Select
                value={values.gstHandling}
                onValueChange={(v) => set('gstHandling', v as TierFormValue['gstHandling'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="INCLUSIVE">GST inclusive</SelectItem>
                  <SelectItem value="EXCLUSIVE">GST exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {values.amountCents > 0 && (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
              After ~{FEE_PERCENT}% in platform &amp; card processing fees, your organisation
              receives about <strong>{fmt(net)}</strong> of each {fmt(values.amountCents)} payment.
            </p>
          )}

          <div className="space-y-2">
            <Label>Member benefits</Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Shown as a checklist on the tier card when members join.
            </p>
            <div className="space-y-2">
              {values.benefits.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={b}
                    placeholder="e.g. Quarterly rescue newsletter"
                    onChange={(e) => updateBenefit(i, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBenefit(i)}
                    aria-label={`Remove benefit ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
              <Plus className="h-4 w-4 mr-2" /> Add benefit
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={values.active} onCheckedChange={(v) => set('active', v)} />
            <Label className="cursor-pointer">Active (available at checkout)</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create tier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
