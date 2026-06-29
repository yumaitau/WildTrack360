import { NextResponse } from 'next/server';
import { verifyAndConstruct, dispatchEvent } from '@/lib/square/webhook';
import { route } from '@/lib/openapi/route';
import { squareWebhookContract } from '../openapi';

export const POST = route(squareWebhookContract, async ({ request }) => {
  const signature = request.headers.get('x-square-hmacsha256-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ?? new URL(request.url).href;

  let event;
  try {
    event = await verifyAndConstruct(rawBody, signature, notificationUrl);
  } catch (error) {
    console.error('Square webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const result = await dispatchEvent(event);
    return { data: result };
  } catch (error) {
    console.error('Square webhook dispatch failed for type:', event.type, error);
    return NextResponse.json({ error: 'Webhook dispatch failed' }, { status: 500 });
  }
});
