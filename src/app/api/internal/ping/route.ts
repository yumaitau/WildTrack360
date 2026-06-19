import { route } from '@/lib/openapi/route';
import { internalPingContract } from '../openapi';

export const GET = route(internalPingContract, async () => {
  return { data: { status: 'ok' } };
});
