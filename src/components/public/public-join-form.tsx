'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AddressAutocomplete, type AddressDetails } from '@/components/address-autocomplete';
import { DynamicFormFields } from '@/components/forms/dynamic-form-fields';
import { SquareCheckout } from '@/components/portal/square-checkout';
import type { FormField } from '@/lib/forms/form-templates';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PublicTier {
  id: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  billingInterval: 'ONE_OFF' | 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  benefits: string[];
}

interface Props {
  handle: string;
  applicationId: string;
  locationId: string;
  orgName: string;
  tiers: PublicTier[];
  templateFields: FormField[];
}

const INTERVAL_LABEL: Record<PublicTier['billingInterval'], string> = {
  ONE_OFF: 'one-off',
  MONTHLY: 'per month',
  ANNUAL: 'per year',
  LIFETIME: 'lifetime',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(cents / 100);
}

export function PublicJoinForm({ handle, applicationId, locationId, tiers, templateFields }: Props) {
  const router = useRouter();
  const [tierId, setTierId] = useState<string>(tiers[0]?.id ?? '');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [addr, setAddr] = useState({
    addressLine1: '',
    addressLine2: '',
    suburb: '',
    state: '',
    postcode: '',
    country: 'AU',
  });
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [showCard, setShowCard] = useState(false);

  const tier = tiers.find((t) => t.id === tierId) ?? null;
  const isRecurring = tier?.billingInterval === 'MONTHLY' || tier?.billingInterval === 'ANNUAL';

  function toCard() {
    if (!tier) return toast.error('Please choose a membership tier');
    if (!firstName.trim() || !lastName.trim()) return toast.error('Enter your first and last name');
    if (!EMAIL.test(email)) return toast.error('Enter a valid email');
    setShowCard(true);
  }

  if (showCard && tier) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Joining <strong>{tier.name}</strong> · {formatAmount(tier.amountCents, tier.currency)}{' '}
          {INTERVAL_LABEL[tier.billingInterval]}
        </p>
        <SquareCheckout
          applicationId={applicationId}
          locationId={locationId}
          endpoint="/api/public/checkout/membership"
          payload={{
            handle,
            tierId: tier.id,
            member: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phone: phone || null,
              ...addr,
              customFields,
            },
          }}
          amountCents={tier.amountCents}
          currency={tier.currency}
          intent={isRecurring ? 'STORE' : 'CHARGE'}
          buyerEmail={email}
          submitLabel={`Join · ${formatAmount(tier.amountCents, tier.currency)}`}
          onSuccess={() => router.push('/join/thank-you')}
          onCancel={() => setShowCard(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Membership</Label>
        <div className="grid gap-2">
          {tiers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTierId(t.id)}
              className={`text-left rounded-md border p-3 transition-colors ${
                tierId === t.id ? 'border-[#3e6f4f] ring-1 ring-[#3e6f4f]' : 'hover:bg-accent'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t.name}</span>
                <Badge variant="outline">{INTERVAL_LABEL[t.billingInterval]}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatAmount(t.amountCents, t.currency)}
                {t.description ? ` · ${t.description}` : ''}
              </div>
              {t.benefits.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {t.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 mt-0.5 text-[#3e6f4f] shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <AddressAutocomplete
          value={addressSearch}
          onChange={setAddressSearch}
          onSelect={(d: AddressDetails) => {
            setAddr((prev) => ({
              ...prev,
              addressLine1: d.streetAddress,
              suburb: d.suburb,
              state: d.state,
              postcode: d.postcode,
            }));
            setAddressSearch(d.formattedAddress);
          }}
          placeholder="Start typing your address…"
        />
        <Input
          placeholder="Address line 1"
          value={addr.addressLine1}
          onChange={(e) => setAddr((p) => ({ ...p, addressLine1: e.target.value }))}
        />
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Suburb" value={addr.suburb} onChange={(e) => setAddr((p) => ({ ...p, suburb: e.target.value }))} />
          <Input placeholder="State" value={addr.state} onChange={(e) => setAddr((p) => ({ ...p, state: e.target.value }))} />
          <Input placeholder="Postcode" value={addr.postcode} onChange={(e) => setAddr((p) => ({ ...p, postcode: e.target.value }))} />
        </div>
      </div>

      {templateFields.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <Label className="text-sm font-semibold">Additional details</Label>
          <DynamicFormFields fields={templateFields} values={customFields} onChange={setCustomFields} />
        </div>
      )}

      <Button className="w-full" onClick={toCard}>
        Continue to payment
      </Button>
    </div>
  );
}
