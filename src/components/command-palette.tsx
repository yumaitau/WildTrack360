'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calculator,
  Command,
  FileSpreadsheet,
  FileText,
  Home,
  PawPrint,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

type CommandIcon =
  | 'admin'
  | 'animals'
  | 'calculator'
  | 'compliance'
  | 'dashboard'
  | 'docs'
  | 'reports'
  | 'settings'
  | 'users';

export type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  group?: string;
  keywords?: string[];
  icon?: CommandIcon;
};

const icons = {
  admin: Settings,
  animals: PawPrint,
  calculator: Calculator,
  compliance: ShieldCheck,
  dashboard: Home,
  docs: FileText,
  reports: FileSpreadsheet,
  settings: Settings,
  users: Users,
};

function scoreItem(item: CommandItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;

  const title = item.title ?? '';
  const haystack = [item.title, item.subtitle, item.group, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (title.toLowerCase().startsWith(q)) return 100;
  if (title.toLowerCase().includes(q)) return 80;
  if (haystack.includes(q)) return 50;

  let cursor = 0;

  for (const char of q) {
    const index = haystack.indexOf(char, cursor);
    if (index === -1) return 0;
    cursor = index + 1;
  }

  return 20;
}

export function CommandPalette({ items }: { items: CommandItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useMemo(() => {
    return items
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 12)
      .map(({ item }) => item);
  }, [items, query]);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const key = typeof event.key === 'string' ? event.key.toLowerCase() : '';
      const isPaletteShortcut = key === 'k' && (event.metaKey || event.ctrlKey);
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('input, textarea, [contenteditable="true"], [contenteditable]'));

      if (isPaletteShortcut && !isEditableTarget) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (key === 'escape') {
        setOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function run(item: CommandItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, results.length - 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const item = results[selectedIndex];
      if (item) run(item);
    }
  }

  if (!open) return null;

  const activeId = results[selectedIndex]?.id
    ? `command-palette-item-${results[selectedIndex].id}`
    : undefined;

  return (
    <div
      aria-labelledby="command-palette-title"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-foreground/25 px-3 pt-[12vh] backdrop-blur-sm sm:px-4"
      role="dialog"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-controls="command-palette-results"
            aria-expanded="true"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search animals, compliance, tools, settings..."
            role="combobox"
            value={query}
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            ESC
          </kbd>
        </div>

        <h2 id="command-palette-title" className="sr-only">
          Command palette
        </h2>
        <div
          id="command-palette-results"
          className="max-h-[420px] overflow-y-auto p-2"
          role="listbox"
        >
          {results.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            results.map((item, index) => {
              const Icon = item.icon ? icons[item.icon] : Command;
              const active = index === selectedIndex;

              return (
                <button
                  id={`command-palette-item-${item.id}`}
                  key={item.id}
                  aria-selected={active}
                  className={[
                    'flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-popover-foreground hover:bg-muted focus-visible:bg-muted',
                  ].join(' ')}
                  onClick={() => run(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  type="button"
                >
                  <Icon
                    className={[
                      'size-4 shrink-0',
                      active ? 'text-primary-foreground/85' : 'text-muted-foreground',
                    ].join(' ')}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {item.subtitle ? (
                      <span
                        className={[
                          'block truncate text-xs',
                          active ? 'text-primary-foreground/75' : 'text-muted-foreground',
                        ].join(' ')}
                      >
                        {item.subtitle}
                      </span>
                    ) : null}
                  </span>
                  {item.group ? (
                    <span
                      className={[
                        'max-w-24 shrink-0 truncate text-xs',
                        active ? 'text-primary-foreground/70' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {item.group}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
