import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registry } from '@/lib/openapi/registry';
// Side-effect import: populates the registry with every route contract.
import '@/lib/openapi/manifest';

// The OpenAPI document version describes the API contract, independent of the
// npm package version. Bump on breaking API changes.
const API_VERSION = '1.0.0';

/** Generate the full OpenAPI 3.1 document from all registered route contracts. */
export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'WildTrack360 API',
      version: API_VERSION,
      description:
        'Internal API reference for WildTrack360. Generated from per-route Zod contracts.',
    },
  });
}
