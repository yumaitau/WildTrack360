'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Member {
  id: string;
  displayName: string;
  region: string | null;
  organisationName: string | null;
  isModerator: boolean;
}

export function CommunityMembersDirectory({ initial }: { initial: Member[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/community/members?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await response.json();
        setResults(payload.members ?? []);
      } catch {
        // Aborted or offline — keep whatever is shown rather than erroring.
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const searchable = query.trim().length > 0;
  const members = searchable ? results : initial;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <Badge className="border-ochre/30 bg-ochre/15 text-ochre hover:bg-ochre/15">Beta</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          People from participating ranger organisations who have joined the community.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by name…"
          className="pl-9"
          aria-label="Search members"
        />
      </div>

      {members.length === 0 ? (
        <div className="py-14 text-center">
          <UsersRound className="mx-auto h-10 w-10 text-sage" />
          <h2 className="mt-3 text-lg font-semibold">
            {searchable
              ? searching
                ? 'Searching…'
                : 'No members match that name'
              : 'No members yet'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {searchable
              ? 'Try a different name or spelling.'
              : 'Members appear here once people join the community beta.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-background">
          {members.map((member) => (
            <li key={member.id}>
              <Link
                href={`/community/members/${member.id}`}
                className="flex items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/50"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-sage/15 text-xs font-semibold text-forest">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{member.displayName}</span>
                    {member.isModerator && (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                        Moderator
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[member.organisationName, member.region].filter(Boolean).join(' · ') ||
                      'Community member'}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
