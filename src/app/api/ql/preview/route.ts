import { NextResponse } from 'next/server';
import { guardQlRequest } from '@/lib/ql/guard';
import { runQuery, QueryError } from '@/lib/ql';
import { MAX_QUERY_LENGTH } from '@/lib/ql/sources';

// POST /api/ql/preview — validate and run a query against the caller's org.
// This route NEVER calls AI generation; it only parses, validates, and reads.
export async function POST(request: Request) {
  const guard = await guardQlRequest();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const query = (body as { query?: unknown })?.query;
  if (typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json({ error: 'A query string is required' }, { status: 400 });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'Query is too long' }, { status: 400 });
  }

  try {
    const result = await runQuery(query, guard.ctx.orgId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof QueryError) {
      return NextResponse.json({ error: e.message, details: e.details }, { status: 400 });
    }
    console.error('QL preview failed:', e);
    return NextResponse.json({ error: 'Failed to run query' }, { status: 500 });
  }
}
