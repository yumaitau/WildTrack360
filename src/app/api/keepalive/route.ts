import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const apiKey = request.headers.get('x-api-key');

  if (!apiKey || apiKey !== process.env.KEEPALIVE_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Simple query to keep the database connection alive
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;

    return NextResponse.json({
      status: 'ok',
      timestamp: result[0].now,
    });
  } catch (error) {
    console.error('Keepalive check failed:', error);
    return NextResponse.json(
      { error: 'Database connection failed' },
      { status: 500 }
    );
  }
}
