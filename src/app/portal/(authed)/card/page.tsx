import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import { getPortalMember } from '@/lib/portal';
import { getMembershipCard } from '@/lib/membership-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Smartphone } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/30',
  LAPSED: 'bg-amber-500/15 text-amber-100 border-amber-300/30',
  CANCELLED: 'bg-white/10 text-white/80 border-white/20',
  DECEASED: 'bg-white/10 text-white/80 border-white/20',
};

export default async function PortalCardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/portal/sign-in');
  const session = await getPortalMember(userId);
  if (!session) redirect('/portal/no-membership');

  const card = await getMembershipCard(session.member);
  const validUntil = card.validUntil
    ? new Date(card.validUntil).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Membership card
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Show this at events. Add it to your home screen for quick access.
        </p>
      </div>

      {/* The card */}
      <div className="rounded-2xl p-6 text-white shadow-lg bg-gradient-to-br from-[#3e6f4f] to-[#2d5a3d]">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-white/70">Member</div>
            <div className="text-lg font-semibold">{card.orgName}</div>
          </div>
          <Badge
            variant="outline"
            className={STATUS_STYLE[card.memberStatus] ?? STATUS_STYLE.CANCELLED}
          >
            {card.memberStatus}
          </Badge>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-bold truncate">{card.memberName}</div>
            {card.tierName && <div className="text-sm text-white/80">{card.tierName}</div>}
            {card.householdOf && (
              <div className="text-xs text-white/70 mt-1">Household of {card.householdOf}</div>
            )}
            {card.giftedBy && (
              <div className="text-xs text-white/70 mt-1">A gift from {card.giftedBy}</div>
            )}
            {card.memberNumber && (
              <div className="text-xs font-mono text-white/70 mt-1">No. {card.memberNumber}</div>
            )}
            {validUntil && <div className="text-xs text-white/70 mt-1">Valid until {validUntil}</div>}
          </div>
          <div
            className="bg-white rounded-lg p-2 w-28 shrink-0 [&>svg]:w-full [&>svg]:h-auto [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: card.qrSvg }}
            aria-label="Membership QR code"
          />
        </div>
      </div>

      <Card>
        <CardContent className="py-4 flex items-start gap-3 text-sm text-muted-foreground">
          <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Keep it handy</p>
            <p className="mt-0.5">
              On iPhone tap Share → Add to Home Screen; on Android use the browser menu → Add to Home
              screen. Staff can scan the code to check you in at events.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
