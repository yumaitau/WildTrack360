import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'node:crypto';
import { route } from '@/lib/openapi/route';
import { keepaliveContract } from './openapi';

export const GET = route(keepaliveContract, async ({ request }) => {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.KEEPALIVE_API_KEY;

  if (!apiKey || !expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const apiKeyBuf = Buffer.from(apiKey, 'utf8');
  const expectedBuf = Buffer.from(expectedKey, 'utf8');
  if (apiKeyBuf.byteLength !== expectedBuf.byteLength ||
      !crypto.timingSafeEqual(apiKeyBuf, expectedBuf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    return { data: { status: 'ok', timestamp: result[0].now } };
  } catch (error) {
    console.error('Keepalive check failed:', error);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
});
