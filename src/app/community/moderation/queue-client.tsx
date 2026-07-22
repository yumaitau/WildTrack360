'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, Eye, Flag, Loader2, ShieldAlert, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface TargetContent {
  title: string | null;
  body: string;
  status: string;
}
interface CasePayload {
  jobs: {
    id: string;
    targetType: string;
    targetId: string;
    title: string | null;
    body: string;
    createdAt: string;
    events: {
      recommendation: string;
      categories: string[];
      reasonCode: string;
      severity: string;
    }[];
  }[];
  reports: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    content: TargetContent | null;
  }[];
  appeals: {
    id: string;
    targetType: string;
    targetId: string;
    explanation: string;
    status: string;
    createdAt: string;
    content: TargetContent | null;
  }[];
}

function TargetPreview({
  targetType,
  content,
}: {
  targetType: string;
  content: TargetContent | null;
}) {
  return (
    <div className="mt-2 rounded-md border bg-muted/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            targetType === 'POST'
              ? 'bg-forest text-cream hover:bg-forest'
              : 'bg-ochre/20 text-ochre hover:bg-ochre/20'
          }
        >
          {targetType.replace('_', ' ')}
        </Badge>
        {content?.status && content.status !== 'PUBLISHED' && (
          <Badge variant="outline" className="text-xs">
            {content.status.toLowerCase()}
          </Badge>
        )}
      </div>
      {content ? (
        <>
          {content.title && <p className="mt-2 text-sm font-semibold">{content.title}</p>}
          <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {content.body}
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Content is no longer available.</p>
      )}
    </div>
  );
}

export function CommunityModerationQueue() {
  const [data, setData] = useState<CasePayload | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function confirmRemove(run: () => void | Promise<void>) {
    const ok = await confirm({
      title: 'Remove this content?',
      description: 'It will be taken down for everyone. The author can appeal.',
      confirmLabel: 'Remove',
    });
    if (ok) await run();
  }
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/community/moderation/cases', { cache: 'no-store' });
      if (!response.ok) throw new Error('Moderation queue could not be loaded');
      setData(await response.json());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Moderation queue could not be loaded');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: 'PUBLISH' | 'HOLD' | 'REMOVE') {
    setActing(id);
    try {
      const response = await fetch(`/api/community/moderation/cases/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reasonCode: `human_${action.toLowerCase()}` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'Decision could not be saved');
      toast.success('Moderation decision saved');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Decision could not be saved');
    } finally {
      setActing(null);
    }
  }

  async function resolve(url: string, payload: Record<string, string>, id: string) {
    setActing(id);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? 'Decision could not be saved');
      toast.success('Moderation decision saved');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Decision could not be saved');
    } finally {
      setActing(null);
    }
  }

  const actReport = (id: string, action: 'DISMISS' | 'REMOVE') =>
    resolve(`/api/community/reports/${id}/actions`, { action }, id);
  const actAppeal = (id: string, action: 'UPHOLD' | 'OVERTURN') =>
    resolve(`/api/community/moderation/appeals/${id}/actions`, { action }, id);

  if (!data)
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      {dialog}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-3">
          <Link href="/community">
            <ArrowLeft /> Community
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rust" />
          <h1 className="text-2xl font-bold">Community moderation</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review held revisions, reports and appeals. Reporter identity is never shown here.
        </p>
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Held revisions</h2>
          <Badge variant="outline">{data.jobs.length}</Badge>
        </div>
        {data.jobs.length === 0 ? (
          <Empty text="No revisions need review." />
        ) : (
          data.jobs.map((job) => {
            const evidence = job.events[0];
            return (
              <article key={job.id} className="rounded-xl border bg-background p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{job.targetType.replace('_', ' ')}</Badge>
                  {evidence?.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category.replaceAll('_', ' ')}
                    </Badge>
                  ))}
                  <time className="ml-auto text-xs text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString('en-AU')}
                  </time>
                </div>
                {job.title && <h3 className="mt-4 text-lg font-semibold">{job.title}</h3>}
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm leading-6">
                  {job.body}
                </pre>
                <div className="mt-3 text-xs text-muted-foreground">
                  Wally: {evidence?.reasonCode ?? 'review_requested'}
                  {evidence?.severity ? ` · ${evidence.severity.toLowerCase()} severity` : ''}
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => act(job.id, 'HOLD')}
                    disabled={acting === job.id}
                  >
                    {acting === job.id ? <Loader2 className="animate-spin" /> : <Eye />} Keep held
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => confirmRemove(() => act(job.id, 'REMOVE'))}
                    disabled={acting === job.id}
                  >
                    <X /> Remove
                  </Button>
                  <Button onClick={() => act(job.id, 'PUBLISH')} disabled={acting === job.id}>
                    <Check /> Publish
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flag className="h-4 w-4" /> Open reports
            </h2>
            <Badge variant="outline">{data.reports.length}</Badge>
          </div>
          {data.reports.length === 0 ? (
            <Empty text="No open reports." />
          ) : (
            data.reports.map((report) => (
              <article key={report.id} className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{report.reason.replaceAll('_', ' ')}</Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {report.targetId.slice(0, 8)}…
                  </span>
                </div>
                <TargetPreview targetType={report.targetType} content={report.content} />
                {report.details && (
                  <p className="mt-2 text-sm">
                    <span className="font-medium">Reporter note:</span> {report.details}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {report.targetType === 'POST' && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/community/posts/${report.targetId}`} target="_blank">
                        <Eye /> View
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actReport(report.id, 'DISMISS')}
                    disabled={acting === report.id}
                  >
                    {acting === report.id ? <Loader2 className="animate-spin" /> : <Check />}{' '}
                    Dismiss
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirmRemove(() => actReport(report.id, 'REMOVE'))}
                    disabled={acting === report.id}
                  >
                    <X /> Remove
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Open appeals</h2>
            <Badge variant="outline">{data.appeals.length}</Badge>
          </div>
          {data.appeals.length === 0 ? (
            <Empty text="No open appeals." />
          ) : (
            data.appeals.map((appeal) => (
              <article key={appeal.id} className="rounded-lg border bg-background p-4">
                <div className="text-[11px] text-muted-foreground">
                  {appeal.targetId.slice(0, 8)}…
                </div>
                <TargetPreview targetType={appeal.targetType} content={appeal.content} />
                <p className="mt-2 text-sm">
                  <span className="font-medium">Appeal:</span> {appeal.explanation}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => actAppeal(appeal.id, 'UPHOLD')}
                    disabled={acting === appeal.id}
                  >
                    {acting === appeal.id ? <Loader2 className="animate-spin" /> : <X />} Keep
                    removed
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => actAppeal(appeal.id, 'OVERTURN')}
                    disabled={acting === appeal.id}
                  >
                    <Check /> Restore
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
