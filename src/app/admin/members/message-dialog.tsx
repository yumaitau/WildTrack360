'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const TOKENS: { token: string; label: string }[] = [
  { token: '{{firstName}}', label: 'First name' },
  { token: '{{lastName}}', label: 'Last name' },
  { token: '{{orgName}}', label: 'Organisation' },
  { token: '{{animalsHelped}}', label: 'Animals helped' },
  { token: '{{animalsReleased}}', label: 'Animals released' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberIds: string[];
  onSent: () => void;
}

export function MessageDialog({ open, onOpenChange, memberIds, onSent }: Props) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<{ animalsHelped: number; animalsReleased: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubject('');
    setBody('');
    setSendEmail(true);
    fetch('/api/members/impact-stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStats(d))
      .catch(() => setStats(null));
  }, [open]);

  function insertToken(token: string) {
    setBody((b) => (b ? `${b}${b.endsWith(' ') || b.endsWith('\n') ? '' : ' '}${token}` : token));
  }

  async function handleSend() {
    if (!subject.trim()) return toast.error('Enter a subject');
    if (!body.trim()) return toast.error('Enter a message');
    setSubmitting(true);
    try {
      const res = await fetch('/api/members/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds, subject, body, sendEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }
      const data = await res.json();
      toast.success(
        `Message sent to ${data.created} member${data.created === 1 ? '' : 's'}` +
          (sendEmail ? ` · ${data.emailed} email${data.emailed === 1 ? '' : 's'} delivered` : '')
      );
      onOpenChange(false);
      onSent();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Message {memberIds.length} member{memberIds.length === 1 ? '' : 's'}
          </DialogTitle>
          <DialogDescription>
            This appears in each member&apos;s portal inbox{sendEmail ? ' and is emailed to them' : ''}.
            Use the merge tags below to personalise it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="msg-subject">Subject</Label>
            <Input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Thank you for your support"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="msg-body">Message</Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder={'Hi {{firstName}},\n\nThanks so much for your support — together we&apos;ve helped care for {{animalsHelped}} animals.'}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TOKENS.map((t) => (
                <button
                  key={t.token}
                  type="button"
                  onClick={() => insertToken(t.token)}
                  className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent"
                  title={`Insert ${t.label}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground pt-1">
                Right now {'{{animalsHelped}}'} = {stats.animalsHelped.toLocaleString('en-AU')} and{' '}
                {'{{animalsReleased}}'} = {stats.animalsReleased.toLocaleString('en-AU')}.
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(!!v)} />
            Also email this message to members
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
