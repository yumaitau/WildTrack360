import type { APIRequestContext } from '@playwright/test';
import { E2E_MARKER } from './constants';

// Safety-net registry: each CRUD spec deletes its own record, but if a run
// crashes mid-test this sweeps anything whose marker field still starts with
// E2E_MARKER. { endpoint } is the list GET (also the DELETE base once any query
// string is stripped); { markerField } is the field the marker was stamped into.
// Keep in sync as CRUD specs are added — only include resources whose list GET
// returns the marker field AND that expose DELETE /{endpoint}/{id}.
export const CLEANUP_REGISTRY: Array<{
  endpoint: string;
  markerField: string;
  collectionField?: string;
}> = [
  { endpoint: '/api/animals', markerField: 'name' },
  { endpoint: '/api/custom-forms', markerField: 'title', collectionField: 'forms' },
  { endpoint: '/api/incidents', markerField: 'description' },
];

async function sweep(
  request: APIRequestContext,
  endpoint: string,
  markerField: string,
  collectionField?: string
): Promise<number> {
  const res = await request.get(endpoint);
  if (!res.ok()) return 0;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return 0;
  }
  const collection = collectionField
    ? (body as Record<string, unknown> | null)?.[collectionField]
    : undefined;
  const rows = (
    Array.isArray(body)
      ? body
      : Array.isArray(collection)
        ? collection
        : Array.isArray((body as { data?: unknown })?.data)
          ? (body as { data: unknown[] }).data
          : []
  ) as Array<Record<string, unknown>>;

  const base = endpoint.split('?')[0];
  let deleted = 0;
  for (const row of rows) {
    const value = row?.[markerField];
    if (typeof row?.id === 'string' && typeof value === 'string' && value.startsWith(E2E_MARKER)) {
      const del = await request.delete(`${base}/${row.id}`);
      if (del.ok()) deleted++;
    }
  }
  return deleted;
}

export async function sweepAll(request: APIRequestContext): Promise<number> {
  let total = 0;
  for (const { endpoint, markerField, collectionField } of CLEANUP_REGISTRY) {
    total += await sweep(request, endpoint, markerField, collectionField);
  }
  return total;
}
