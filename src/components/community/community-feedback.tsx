'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { MessageCircleHeart, Send } from 'lucide-react';
import { toast } from 'sonner';
import { FieldStatus, validateCommunityText } from './field-status';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const nextOptions = [
  ['IMAGES_FILES', 'Images and files'],
  ['REGIONAL_PRIVATE_GROUPS', 'Regional or private groups'],
  ['DIRECT_MESSAGES', 'Direct messages'],
  ['EVENTS', 'Events'],
  ['BETTER_SEARCH', 'Better search'],
  ['MOBILE_PUSH', 'Mobile and push notifications'],
  ['ORGANISATION_PROFILES', 'Organisation profiles'],
] as const;

export function CommunityFeedback({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('FEATURE_REQUEST');
  const [message, setMessage] = useState('');
  const [requestedFeature, setRequestedFeature] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const problem = validateCommunityText(message, { min: 5, max: 4_000, field: 'Feedback' });
    if (problem) {
      toast.error(problem);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/community/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          requestedFeatures: requestedFeature ? [requestedFeature] : [],
          pageContext: pathname,
          contactConsent,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Feedback could not be sent');
      toast.success('Thanks. Your feedback is with the WildTrack360 team.');
      setMessage('');
      setRequestedFeature('');
      setContactConsent(false);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Feedback could not be sent');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={compact ? 'ghost' : 'outline'} size={compact ? 'sm' : 'default'}>
          <MessageCircleHeart />
          Send beta feedback
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Help shape Community</SheetTitle>
          <SheetDescription>
            Feedback is private to the WildTrack360 team. The current page is included, but no post
            or chat content is copied.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="feedback-type">What kind of feedback is this?</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="feedback-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FEATURE_REQUEST">Feature request</SelectItem>
                <SelectItem value="BUG">Bug</SelectItem>
                <SelectItem value="CONFUSING_EXPERIENCE">Something was confusing</SelectItem>
                <SelectItem value="SAFETY_MODERATION">Safety or moderation concern</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Tell us what happened or what should change</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={7}
              maxLength={4000}
              placeholder="A little context helps us act on this…"
              aria-invalid={message.trim().length > 0 && message.trim().length < 5}
            />
            <FieldStatus value={message} min={5} max={4_000} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-next">What would you most like next? (optional)</Label>
            <Select value={requestedFeature} onValueChange={setRequestedFeature}>
              <SelectTrigger id="feedback-next">
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                {nextOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={contactConsent}
              onChange={(event) => setContactConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input accent-forest"
            />
            <span>WildTrack360 may contact me about this feedback.</span>
          </label>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            <Send />
            {submitting ? 'Sending…' : 'Send feedback'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
