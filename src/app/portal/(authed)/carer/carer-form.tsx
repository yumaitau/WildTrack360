'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CarerForm({ defaultPhone }: { defaultPhone: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(defaultPhone);
  const [availability, setAvailability] = useState('');
  const [experience, setExperience] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/portal/carer-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, availability, experience, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      toast.success('Thank you — we’ll be in touch soon');
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Best contact number" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="availability">Your availability</Label>
        <Textarea
          id="availability"
          rows={2}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          placeholder="e.g. weekends, evenings, school holidays"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="experience">Any relevant experience</Label>
        <Textarea
          id="experience"
          rows={3}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Tell us about any animal care, fostering or volunteering experience (optional)"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="message">Anything else?</Label>
        <Textarea
          id="message"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Questions or anything you'd like us to know (optional)"
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? 'Submitting…' : 'Register my interest'}
      </Button>
    </form>
  );
}
