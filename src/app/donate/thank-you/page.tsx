import { PublicShell } from '@/components/public/public-shell';

export default function DonateThankYouPage() {
  return (
    <PublicShell
      title="Thank you!"
      subtitle="Your donation has been received and a receipt is on its way to your email."
    >
      <p className="text-sm text-muted-foreground">You can safely close this window.</p>
    </PublicShell>
  );
}
