import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/openapi-server/admin-guard';
import { generateOpenApiDocument } from '@/lib/openapi/generate';

// Live OpenAPI 3.1 document, generated from all registered route contracts.
// Admin-only: it exposes the full internal API surface.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json(generateOpenApiDocument());
}
