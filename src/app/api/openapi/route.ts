import { NextResponse } from 'next/server';
import { requireDocsAccess } from '@/lib/openapi-server/docs-access';
import { generateOpenApiDocument } from '@/lib/openapi/generate';
import { route } from '@/lib/openapi/route';
import { apiOpenApiContract } from './openapi';

// Live OpenAPI 3.1 document, generated from all registered route contracts.
// Open in dev; any authenticated user in production (see requireDocsAccess).
export const GET = route(apiOpenApiContract, async () => {
  const denied = await requireDocsAccess();
  if (denied) return denied;
  return NextResponse.json(generateOpenApiDocument());
});
