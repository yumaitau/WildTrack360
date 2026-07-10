'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AddressAutocomplete, type AddressDetails } from '@/components/address-autocomplete';

interface ProfileValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export function ProfileForm({ initial }: { initial: ProfileValue }) {
  const [values, setValues] = useState<ProfileValue>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [addressSearch, setAddressSearch] = useState(initial.addressLine1);

  function set<K extends keyof ProfileValue>(key: K, v: ProfileValue[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { email: _email, ...patch } = values;
      void _email;
      const res = await fetch('/api/portal/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to save');
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input value={values.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          </Field>
          <Field label="Last name" required>
            <Input value={values.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input value={values.email} disabled />
            <p className="text-xs text-muted-foreground mt-1">
              To change your email, contact your wildlife organisation.
            </p>
          </Field>
          <Field label="Phone">
            <Input value={values.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
            value={values.addressLine1}
            onChange={(e) => set('addressLine1', e.target.value)}
          />
          <Input
            placeholder="Address line 2"
            value={values.addressLine2}
            onChange={(e) => set('addressLine2', e.target.value)}
          />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Suburb" value={values.suburb} onChange={(e) => set('suburb', e.target.value)} />
            <Input placeholder="State" value={values.state} onChange={(e) => set('state', e.target.value)} />
            <Input placeholder="Postcode" value={values.postcode} onChange={(e) => set('postcode', e.target.value)} />
          </div>
          <Input placeholder="Country" value={values.country} onChange={(e) => set('country', e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
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
