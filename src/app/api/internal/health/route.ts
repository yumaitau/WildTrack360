import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { route } from '@/lib/openapi/route';
import { internalHealthContract } from '../openapi';

export const GET = route(internalHealthContract, async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { data: { status: 'ok' } };
  } catch {
    return NextResponse.json({ status: 'error', message: 'Database connection failed' }, { status: 503 });
  }
});
