import { NextResponse } from 'next/server';
import { guardQlRequest } from '@/lib/ql/guard';
import { SOURCES, CHART_TYPES } from '@/lib/ql/sources';

// GET /api/ql/sources — the allowlist used by the editor for autocomplete and
// example building. This is the SAME registry validation uses, so autocomplete
// can never suggest a field the validator would reject.
export async function GET() {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;

  const sources = Object.entries(SOURCES).map(([key, source]) => ({
    key,
    label: source.label,
    dateField: source.dateField,
    fields: Object.entries(source.fields).map(([fieldKey, def]) => ({
      key: fieldKey,
      label: def.label,
      groupable: !!def.groupable,
      filterable: !!def.filterable,
      summable: !!def.summable,
      enumValues: def.enumValues ?? null,
    })),
  }));

  return NextResponse.json({ sources, chartTypes: CHART_TYPES });
}
