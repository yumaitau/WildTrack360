'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Result {
  id: string;
  title: string | null;
  type: string;
  lastActivityAt: string;
}

export function CommunitySearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    const term = q.trim();
    if (!term) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/community/search?q=${encodeURIComponent(term)}`);
      const data = (await res.json()) as { results?: Result[] };
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-4">
      <form onSubmit={run} role="search" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search published community posts…"
          aria-label="Search community posts"
          className="pl-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </form>
      {results !== null && (
        <div className="mt-2 rounded-md border bg-background p-2 text-sm">
          {results.length === 0 ? (
            <p className="px-2 py-1 text-muted-foreground">No matching posts.</p>
          ) : (
            <ul className="divide-y">
              {results.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/community/posts/${r.id}`}
                    className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-cream/40"
                  >
                    <span className="truncate">{r.title ?? '(untitled)'}</span>
                    <span className="shrink-0 text-xs uppercase text-muted-foreground">
                      {r.type.toLowerCase()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
