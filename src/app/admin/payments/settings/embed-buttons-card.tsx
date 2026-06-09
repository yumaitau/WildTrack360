'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Code2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EmbedData {
  handle: string;
  baseUrl: string;
  donateUrl: string;
  joinUrl: string;
}

const BTN_STYLE =
  'display:inline-block;background:#3e6f4f;color:#ffffff;padding:12px 22px;border-radius:8px;font-weight:bold;font-family:Arial,sans-serif;text-decoration:none';

function snippetFor(url: string, label: string) {
  return `<a href="${url}" style="${BTN_STYLE}">${label}</a>`;
}

// Self-fetching card: persists the org's public handle and shows copy-paste
// link-button snippets for the public donate + join pages.
export function EmbedButtonsCard() {
  const [data, setData] = useState<EmbedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/square/embed');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Failed to load embed details');
        }
        setData((await res.json()) as EmbedData);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-5 w-5" /> Embed buttons
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Paste these buttons into your own website to let supporters donate or become members. Each
          opens your secure WildTrack360 page — no setup needed on your site.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <p className="text-sm text-amber-600">{error}</p>
        ) : data ? (
          <>
            <Snippet
              title="Donate button"
              buttonLabel="🦝 Donate"
              url={data.donateUrl}
              onCopy={copy}
            />
            <Snippet
              title="Become a member button"
              buttonLabel="Become a member"
              url={data.joinUrl}
              onCopy={copy}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Snippet({
  title,
  buttonLabel,
  url,
  onCopy,
}: {
  title: string;
  buttonLabel: string;
  url: string;
  onCopy: (text: string) => void;
}) {
  const snippet = snippetFor(url, buttonLabel);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <Button size="sm" variant="outline" onClick={() => onCopy(snippet)}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Copy code
        </Button>
      </div>
      <div className="rounded-md border p-3 bg-muted/30">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-block',
            background: '#3e6f4f',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: 8,
            fontWeight: 'bold',
            textDecoration: 'none',
          }}
        >
          {buttonLabel}
        </a>
      </div>
      <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
  );
}
