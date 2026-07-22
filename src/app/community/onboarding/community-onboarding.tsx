'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Building2, Check, Loader2, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { FieldStatus, validateCommunityText } from '@/components/community/field-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CommunityOnboarding({
  defaultDisplayName,
  defaultShowOrganisationBadge,
  defaultRegion,
  organisationName,
}: {
  defaultDisplayName: string;
  defaultShowOrganisationBadge: boolean;
  defaultRegion: string;
  organisationName: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [showBadge, setShowBadge] = useState(defaultShowOrganisationBadge);
  const [region, setRegion] = useState(defaultRegion);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function join() {
    const nameProblem = validateCommunityText(displayName, {
      min: 2,
      max: 60,
      field: 'Display name',
    });
    if (nameProblem) {
      toast.error(nameProblem);
      return;
    }
    // Region is optional, but once it has content it must clear the same 2–80 rule the server enforces.
    if (region.trim().length > 0) {
      const regionProblem = validateCommunityText(region, { min: 2, max: 80, field: 'Region' });
      if (regionProblem) {
        toast.error(regionProblem);
        return;
      }
    }
    if (!accepted) {
      toast.error('Please accept the community guidelines to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          showOrganisationBadge: showBadge,
          region: region.trim() || null,
          acceptGuidelines: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Community profile could not be saved');
      toast.success('Welcome to Community');
      router.replace('/community');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Community profile could not be saved');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border bg-background shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
      <section className="bg-forest p-7 text-cream sm:p-10">
        <span className="inline-flex rounded-md bg-ochre/20 px-2.5 py-1 text-xs font-semibold text-ochre">
          Invite-only beta
        </span>
        <h1 className="mt-5 text-3xl font-bold leading-tight">
          Useful knowledge, shared across ranger teams
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-cream/75">
          Community is a product-wide space for practical questions, experiences and WildTrack360
          feedback.
        </p>
        <ul className="mt-8 space-y-5 text-sm">
          <li className="flex gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-ochre" />
            <span>
              <strong className="block text-cream">Share intentionally</strong>
              <span className="text-cream/70">
                Nothing from your organisation&apos;s operational records is shared automatically.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-ochre" />
            <span>
              <strong className="block text-cream">Wally checks contributions</strong>
              <span className="text-cream/70">
                New and edited content is checked before other people can see it.
              </span>
            </span>
          </li>
          <li className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-ochre" />
            <span>
              <strong className="block text-cream">Verified, not public</strong>
              <span className="text-cream/70">
                Community is available only to signed-in people from participating organisations.
              </span>
            </span>
          </li>
        </ul>
      </section>

      <section className="p-7 sm:p-10">
        <div className="mb-7">
          <h2 className="text-xl font-semibold">Set up your community identity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your email, account identifiers and WildTrack360 role are never shown.
          </p>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="community-display-name">Display name</Label>
            <Input
              id="community-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={60}
              aria-invalid={displayName.trim().length > 0 && displayName.trim().length < 2}
            />
            <FieldStatus value={displayName} min={2} max={60} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="community-region">Broad region or state (optional)</Label>
            <Input
              id="community-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              maxLength={80}
              placeholder="For example, Top End or NSW"
              aria-invalid={region.trim().length > 0 && region.trim().length < 2}
            />
            <p className="text-xs text-muted-foreground">Never enter an exact location here.</p>
            {region.length > 0 && <FieldStatus value={region} min={2} max={80} />}
          </div>
          <label className="flex items-start gap-3 rounded-lg border px-4 py-3">
            <input
              type="checkbox"
              checked={showBadge}
              onChange={(event) => setShowBadge(event.target.checked)}
              className="mt-1 h-4 w-4 accent-forest"
            />
            <span className="text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-4 w-4 text-sage" /> Show verified organisation badge
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                People will see that you are from {organisationName}. You can change this later.
              </span>
            </span>
          </label>
          <div className="rounded-lg bg-muted/60 p-4 text-sm">
            <p className="font-semibold">Before you join</p>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" /> Do not post exact
                sensitive wildlife or cultural locations.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" /> Do not post personal
                information or confidential organisation material.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" /> Use normal organisation
                channels for emergencies and urgent safety work.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sage" /> Reports and appeals are
                reviewed without revealing who made a report.
              </li>
            </ul>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-forest"
            />
            <span>
              I understand this is a cross-organisation beta and accept the community guidelines and
              automated-moderation disclosure.
            </span>
          </label>
          <Button className="w-full" size="lg" onClick={join} disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            {submitting ? 'Saving…' : 'Join Community'}
          </Button>
        </div>
      </section>
    </div>
  );
}
