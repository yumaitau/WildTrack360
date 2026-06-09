import { NextResponse } from 'next/server';
import { verifyAndConstruct, dispatchEvent } from '@/lib/square/webhook';

// Square requires the raw body for HMAC signature verification, so this route
// reads request.text() rather than request.json(). The notification URL used in
// the signature must exactly match the URL configured on the Square webhook
// subscription — pin it via SQUARE_WEBHOOK_NOTIFICATION_URL.
export async function POST(request: Request) {
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
    return NextResponse.json(result);
  } catch (error) {
    // event.type is attacker-controlled, so keep it out of the format-string
    // position — pass it as a separate argument.
    console.error('Square webhook dispatch failed for type:', event.type, error);
    return NextResponse.json({ error: 'Webhook dispatch failed' }, { status: 500 });
  }
}
