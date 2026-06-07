import { NextResponse } from 'next/server';
import { dispatchEvent, verifyAndConstruct } from '@/lib/stripe/webhook';

// Stripe requires the raw body for signature verification, so this route does
// NOT use `request.json()`. It reads the raw text then constructs the event
// via stripe.webhooks.constructEvent which throws if the signature is invalid.
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = verifyAndConstruct(rawBody, signature);
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const result = await dispatchEvent(event);
    return NextResponse.json(result);
  } catch (error) {
    console.error(`Stripe webhook dispatch failed for ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook dispatch failed' }, { status: 500 });
  }
}
