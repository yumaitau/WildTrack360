'use client';

// CodeMirror-based editor for the custom reporting QL. Syntax highlighting and
// autocomplete are both derived from CUSTOM_QUERY_FIELDS_BY_SOURCE so there is
// no second source/field list to keep in sync.

import * as React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import {
  autocompletion,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { StreamLanguage } from '@codemirror/language';
import { CUSTOM_QUERY_FIELDS_BY_SOURCE } from '@/lib/custom-query/allowlist';

const KEYWORDS = [
  'count',
  'sum',
  'from',
  'between',
  'and',
  'where',
  'group',
  'by',
  'trend',
  'limit',
  'chart',
  'as',
  'number',
  'table',
  'bar',
  'pie',
  'line',
];

const SOURCES = Object.keys(CUSTOM_QUERY_FIELDS_BY_SOURCE);
const ALL_FIELDS = Array.from(
  new Set(Object.values(CUSTOM_QUERY_FIELDS_BY_SOURCE).flat())
);

const keywordSet = new Set(KEYWORDS);
const sourceSet = new Set(SOURCES);

// Lightweight stream tokeniser purely for highlighting.
const qlLanguage = StreamLanguage.define<unknown>({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/\d{4}-\d{2}-\d{2}/) || stream.match(/\d+/)) return 'number';
    if (stream.match(/"[^"]*"/) || stream.match(/'[^']*'/)) return 'string';
    const word = stream.match(/[A-Za-z_][\w]*/) as RegExpMatchArray | null;
    if (word) {
      const lower = word[0].toLowerCase();
      if (keywordSet.has(lower)) return 'keyword';
      if (sourceSet.has(lower)) return 'typeName';
      return 'variableName';
    }
    stream.next();
    return null;
  },
});

function completeQl(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w_]+/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const lineStart = context.state.doc.lineAt(context.pos).from;
  const before = context.state.doc.sliceString(lineStart, context.pos).toLowerCase();
  const afterFrom = /\bfrom\s+[\w_]*$/.test(before);

  const options = afterFrom
    ? SOURCES.map((label) => ({ label, type: 'class' as const }))
    : [
        ...KEYWORDS.map((label) => ({ label, type: 'keyword' as const })),
        ...ALL_FIELDS.map((label) => ({ label, type: 'property' as const })),
        ...SOURCES.map((label) => ({ label, type: 'class' as const })),
      ];

  return { from: word.from, options };
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function QlEditor({ value, onChange, placeholder }: Props) {
  return (
    <div className="overflow-hidden rounded-md border">
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={
          placeholder ??
          'e.g. count from incidents group by severity chart bar'
        }
        height="140px"
        extensions={[qlLanguage, autocompletion({ override: [completeQl] })]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          autocompletion: true,
        }}
      />
    </div>
  );
}
