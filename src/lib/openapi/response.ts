import * as Sentry from '@sentry/nextjs';
import type { ZodTypeAny } from 'zod';

/**
 * Validate a handler's success payload against its response contract.
 *
 * Schemas describe the SERIALISED wire shape, so we validate the JSON-roundtripped
 * payload (Date -> ISO string, etc.). Failure mode is environment-dependent:
 *   - development / test: THROW (surfaces contract bugs loudly during dev + CI)
 *   - production: log to Sentry and return - a docs/schema mismatch must never
 *     turn a working endpoint into a 500 for a real user.
 */
export function validateResponse(schema: ZodTypeAny, data: unknown): void {
  const wire = JSON.parse(JSON.stringify(data));
  const result = schema.safeParse(wire);
  if (result.success) return;

  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(new Error('OpenAPI response contract validation failed'), {
      extra: { issues: result.error.issues },
    });
    return;
  }

  throw new Error(
    `Response contract validation failed: ${JSON.stringify(result.error.issues)}`,
  );
}
