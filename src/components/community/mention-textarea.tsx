'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { MentionRef } from './rich-text';

interface MemberHit {
  id: string;
  displayName: string;
  organisationName: string | null;
  isModerator: boolean;
}

// Text before the caret ending in "@partial" (allowing spaces so multi-word
// display names work), where the "@" starts the string or follows whitespace so
// an email like foo@bar never triggers the picker.
const TRIGGER = /(?:^|\s)@([^\n@]{0,40})$/;

type MentionTextareaProps = {
  value: string;
  onValueChange: (value: string) => void;
  mentions: MentionRef[];
  onMentionsChange: (mentions: MentionRef[]) => void;
} & Omit<React.ComponentProps<typeof Textarea>, 'value' | 'onChange'>;

// A Textarea with @mention typeahead. It keeps the caller's mention list in sync
// with what's actually written: selecting a member inserts "@DisplayName" and
// records {id, name}; edits prune any mention whose token no longer appears. The
// server re-validates regardless, so this is convenience, not trust.
export function MentionTextarea({
  value,
  onValueChange,
  mentions,
  onMentionsChange,
  className,
  ...textareaProps
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [hits, setHits] = useState<MemberHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState<string | null>(null);
  // Suppress reopening on the exact query we just accepted (the inserted name
  // still matches TRIGGER until the next keystroke).
  const acceptedRef = useRef<string | null>(null);

  const detectQuery = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const match = value.slice(0, caret).match(TRIGGER);
    const next = match ? match[1] : null;
    setQuery(next);
    if (next === null || next.trim() === acceptedRef.current) {
      setOpen(false);
    }
  }, [value]);

  useEffect(() => {
    // The dropdown only renders while `open`, and detectQuery already closes it
    // when the query clears — so stale hits never show and we avoid a synchronous
    // setState here (which would trip react-hooks/set-state-in-effect).
    const trimmed = query?.trim() ?? '';
    if (trimmed.length === 0 || trimmed === acceptedRef.current) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/community/members?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await response.json();
        const members: MemberHit[] = payload.members ?? [];
        setHits(members);
        setActive(0);
        setOpen(members.length > 0);
      } catch {
        // Aborted or offline — leave the menu closed rather than erroring.
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const select = useCallback(
    (hit: MemberHit) => {
      const el = ref.current;
      const caret = el?.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const match = before.match(TRIGGER);
      if (!match) return;
      const at = caret - match[1].length - 1;
      const token = `@${hit.displayName} `;
      const nextValue = value.slice(0, at) + token + value.slice(caret);
      onValueChange(nextValue);
      if (!mentions.some((m) => m.id === hit.id)) {
        onMentionsChange([...mentions, { id: hit.id, name: hit.displayName }]);
      }
      acceptedRef.current = hit.displayName;
      setOpen(false);
      setHits([]);
      // Restore focus + place the caret just after the inserted token.
      requestAnimationFrame(() => {
        const node = ref.current;
        if (!node) return;
        const pos = at + token.length;
        node.focus();
        node.setSelectionRange(pos, pos);
      });
    },
    [value, mentions, onValueChange, onMentionsChange]
  );

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    acceptedRef.current = null;
    onValueChange(next);
    // Drop mentions whose token the author has since deleted.
    const pruned = mentions.filter((m) => next.includes(`@${m.name}`));
    if (pruned.length !== mentions.length) onMentionsChange(pruned);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || hits.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % hits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + hits.length) % hits.length);
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      select(hits[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Textarea
        {...textareaProps}
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={detectQuery}
        onClick={detectQuery}
        className={className}
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && hits.length > 0 && (
        <ul
          className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-md border bg-popover p-1 shadow-md"
          role="listbox"
        >
          {hits.map((hit, index) => (
            <li key={hit.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                // onMouseDown (not onClick) so selecting fires before the
                // textarea's blur closes the menu.
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(hit);
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  index === active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
              >
                <span className="truncate font-medium">@{hit.displayName}</span>
                {hit.organisationName && (
                  <span className="truncate text-xs text-muted-foreground">
                    {hit.organisationName}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
