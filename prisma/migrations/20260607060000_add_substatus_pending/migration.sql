-- Add PENDING to SubStatus so a RecurringDonation row can exist with a NULL
-- stripe_subscription_id (created before the Stripe call as the idempotency
-- anchor) without being misreported as an ACTIVE subscription. The webhook
-- flips it to ACTIVE when the first invoice settles, and the existing
-- customer.subscription.updated handler maps Stripe states the same way.

ALTER TYPE "public"."SubStatus" ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'ACTIVE';
