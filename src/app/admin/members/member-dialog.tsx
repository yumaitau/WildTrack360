'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DynamicFormFields } from '@/components/forms/dynamic-form-fields';
import { AddressAutocomplete, type AddressDetails } from '@/components/address-autocomplete';
import type { FormField } from '@/lib/forms/form-templates';

export interface MemberFormValue {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  memberNumber?: string | null;
  status?: 'ACTIVE' | 'LAPSED' | 'CANCELLED' | 'DECEASED';
  customFields?: Record<string, unknown>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: (Partial<MemberFormValue> & { id?: string; customFieldsJson?: unknown }) | null;
  onSubmit: (values: MemberFormValue) => void | Promise<void>;
}

const EMPTY: MemberFormValue = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  suburb: '',
  state: '',
  postcode: '',
  country: 'AU',
  memberNumber: '',
  status: 'ACTIVE',
  customFields: {},
};

export function MemberDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [values, setValues] = useState<MemberFormValue>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [customFieldsTemplate, setCustomFieldsTemplate] = useState<FormField[]>([]);
  const [addressSearch, setAddressSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/form-templates/MEMBER')
      .then((res) => (res.ok ? res.json() : { fields: [] }))
      .then((data) => {
        if (!cancelled) setCustomFieldsTemplate((data.fields ?? []) as FormField[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (open) {
      const seededCustom =
        initial && initial.customFieldsJson && typeof initial.customFieldsJson === 'object'
          ? (initial.customFieldsJson as Record<string, unknown>)
          : (initial?.customFields ?? {});
      setValues({
        ...EMPTY,
        ...(initial ?? {}),
        status: initial?.status ?? 'ACTIVE',
        country: initial?.country ?? 'AU',
        customFields: seededCustom,
      });
      setAddressSearch(initial?.addressLine1 ?? '');
    }
  }, [open, initial]);

  function set<K extends keyof MemberFormValue>(key: K, v: MemberFormValue[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit member' : 'New member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" required>
              <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} required />
            </Field>
            <Field label="Last name" required>
              <Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={values.email} onChange={(e) => set('email', e.target.value)} required />
            </Field>
            <Field label="Phone">
              <Input value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Member number">
              <Input value={values.memberNumber ?? ''} onChange={(e) => set('memberNumber', e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={values.status} onValueChange={(v) => set('status', v as MemberFormValue['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="LAPSED">Lapsed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="DECEASED">Deceased</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <AddressAutocomplete
              value={addressSearch}
              onChange={setAddressSearch}
              onSelect={(details: AddressDetails) => {
                set('addressLine1', details.streetAddress);
                set('suburb', details.suburb);
                set('state', details.state);
                set('postcode', details.postcode);
                setAddressSearch(details.formattedAddress);
              }}
              placeholder="Start typing an address..."
            />
            <Input
              placeholder="Address line 1"
              value={values.addressLine1 ?? ''}
              onChange={(e) => set('addressLine1', e.target.value)}
            />
            <Input
              placeholder="Address line 2"
              value={values.addressLine2 ?? ''}
              onChange={(e) => set('addressLine2', e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Suburb"
                value={values.suburb ?? ''}
                onChange={(e) => set('suburb', e.target.value)}
              />
              <Input
                placeholder="State"
                value={values.state ?? ''}
                onChange={(e) => set('state', e.target.value)}
              />
              <Input
                placeholder="Postcode"
                value={values.postcode ?? ''}
                onChange={(e) => set('postcode', e.target.value)}
              />
            </div>
            <Input
              placeholder="Country"
              value={values.country ?? 'AU'}
              onChange={(e) => set('country', e.target.value)}
            />
          </div>

          {customFieldsTemplate.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">Additional details</Label>
              <DynamicFormFields
                fields={customFieldsTemplate}
                values={values.customFields ?? {}}
                onChange={(next) => set('customFields', next)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
