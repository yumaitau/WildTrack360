import { DonateForm } from './donate-form';

export default function PortalDonatePage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Make a donation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Support your wildlife organisation with a one-off donation. Payment goes directly to their Stripe account; WildTrack360 takes a 5% platform fee.
        </p>
      </div>
      <DonateForm />
    </div>
  );
}
