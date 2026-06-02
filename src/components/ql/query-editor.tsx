'use client';

// Query editor: a textarea with a syntax-highlight overlay plus an autocomplete
// panel whose suggestions are drawn from the SAME allowlist the server validates
// against (fetched via /api/ql/sources). Highlighting is rendered in a mirrored
// <pre> behind a transparent <textarea>.

import * as React from 'react';

export interface SourceMeta {
  key: string;
  label: string;
  dateField: string;
  fields: {
    key: string;
    label: string;
    groupable: boolean;
    filterable: boolean;
    summable: boolean;
    enumValues: string[] | null;
  }[];
}

const KEYWORDS = new Set(['from', 'where', 'and', 'since', 'until', 'group', 'by', 'select', 'count', 'sum', 'avg', 'in']);

function classify(token: string): string {
  const lower = token.toLowerCase();
  if (KEYWORDS.has(lower)) return 'text-sky-600 dark:text-sky-400 font-semibold';
  if (token === '=' || token === '!=' || token === '(' || token === ')' || token === ',') return 'text-muted-foreground';
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return 'text-emerald-600 dark:text-emerald-400';
  if (/^[A-Z][A-Z0-9_]*$/.test(token)) return 'text-amber-600 dark:text-amber-400'; // enum-like
  return 'text-foreground';
}

function highlight(text: string): React.ReactNode[] {
  // Split while preserving whitespace and punctuation so the overlay aligns 1:1.
  const parts = text.split(/(\s+|[(),=!]+)/);
  return parts.map((part, i) => {
    if (part === '' ) return null;
    if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
    return (
      <span key={i} className={classify(part)}>
        {part}
      </span>
    );
  });
}

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  sources: SourceMeta[];
}

export function QueryEditor({ value, onChange, sources }: QueryEditorProps) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const preRef = React.useRef<HTMLPreElement>(null);

  // Keep the highlight layer scrolled in sync with the textarea.
  const syncScroll = () => {
    if (preRef.current && taRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };

  const insert = (snippet: string) => {
    const ta = taRef.current;
    if (!ta) {
      onChange(value ? `${value} ${snippet}` : snippet);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const needsSpace = start > 0 && !/\s$/.test(value.slice(0, start));
    const text = `${needsSpace ? ' ' : ''}${snippet} `;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
      syncScroll();
    });
  };

  // Detect the source referenced in the query (token after "from") to scope
  // field suggestions.
  const activeSource = React.useMemo(() => {
    const match = value.match(/\bfrom\s+([A-Za-z0-9_]+)/i);
    if (!match) return null;
    return sources.find((s) => s.key === match[1]) ?? null;
  }, [value, sources]);

  return (
    <div className="space-y-2">
      <div className="relative font-mono text-sm">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-auto whitespace-pre-wrap break-words rounded-md border border-transparent p-3"
        >
          {highlight(value)}
          {/* trailing newline keeps the last line visible */}
          {'\n'}
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          spellCheck={false}
          rows={4}
          placeholder="from animals group by species select count"
          className="relative w-full resize-y rounded-md border bg-transparent p-3 text-transparent caret-foreground whitespace-pre-wrap break-words focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2 text-xs">
        <SuggestionRow label="Keywords">
          {['from', 'where', 'and', 'since', 'until', 'group by', 'select', 'count', 'sum', 'avg'].map((kw) => (
            <Chip key={kw} onClick={() => insert(kw)}>
              {kw}
            </Chip>
          ))}
        </SuggestionRow>

        <SuggestionRow label="Sources">
          {sources.map((s) => (
            <Chip key={s.key} onClick={() => insert(s.key)} title={s.label}>
              {s.key}
            </Chip>
          ))}
        </SuggestionRow>

        {activeSource && (
          <SuggestionRow label={`${activeSource.label} fields`}>
            {activeSource.fields.map((f) => (
              <Chip
                key={f.key}
                onClick={() => insert(f.key)}
                title={[
                  f.label,
                  f.groupable && 'groupable',
                  f.filterable && 'filterable',
                  f.summable && 'numeric',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              >
                {f.key}
              </Chip>
            ))}
          </SuggestionRow>
        )}
      </div>
    </div>
  );
}

function SuggestionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-1 w-full sm:w-auto">{label}:</span>
      {children}
    </div>
  );
}

function Chip({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}
