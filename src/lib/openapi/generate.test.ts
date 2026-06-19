import { describe, it, expect } from 'vitest';
import { generateOpenApiDocument } from './generate';

describe('generateOpenApiDocument', () => {
  it('produces an OpenAPI 3.1.0 document with the API info', () => {
    const doc = generateOpenApiDocument();
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('WildTrack360 API');
    expect(typeof doc.info.version).toBe('string');
  });

  it('registers the three security schemes', () => {
    const doc = generateOpenApiDocument();
    const schemes = doc.components?.securitySchemes ?? {};
    expect(Object.keys(schemes)).toEqual(
      expect.arrayContaining(['clerkSession', 'internalSecret', 'squareSignature'])
    );
  });
});
