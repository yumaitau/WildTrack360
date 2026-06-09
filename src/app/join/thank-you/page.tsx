import { PublicShell } from '@/components/public/public-shell';

export default function JoinThankYouPage() {
  return (
    <PublicShell
      title="Welcome aboard!"
      subtitle="Your membership is confirmed and a receipt is on its way to your email."
    >
      <p className="text-sm text-muted-foreground">
        Check your email for an invitation to activate your member portal, where you can manage your
        membership and download receipts.
      </p>
    </PublicShell>
  );
}
