import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/subdomain';
import { resolvePublicOrg } from '@/lib/public-org';
import { prisma } from '@/lib/prisma';
import { getActiveTemplate } from '@/lib/forms/form-template-service';
import { PublicShell } from '@/components/public/public-shell';
import { PublicJoinForm, type PublicTier } from '@/components/public/public-join-form';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// Public, no-login "become a member" page served on the org subdomain
// ({org}.wildtrack360.com.au/join).
export default async function JoinPage() {
  const host = (await headers()).get('host') ?? '';
  const handle = extractSubdomain(host, ROOT_DOMAIN);
  const org = handle ? await resolvePublicOrg(handle) : null;

  if (!org || !handle) {
    return (
      <PublicShell
        title="Membership unavailable"
        subtitle="This organisation isn't accepting online memberships yet."
      >
        <p className="text-sm text-muted-foreground">Please check back later.</p>
      </PublicShell>
    );
  }

  const tierRows = await prisma.membershipTier.findMany({
    where: { clerkOrganizationId: org.orgId, active: true, archivedAt: null },
    orderBy: { amountCents: 'asc' },
    select: {
      id: true,
      name: true,
      description: true,
      amountCents: true,
      currency: true,
      billingInterval: true,
      benefitsJson: true,
    },
  });
  const tiers = tierRows.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    amountCents: t.amountCents,
    currency: t.currency,
    billingInterval: t.billingInterval,
    benefits: Array.isArray(t.benefitsJson) ? (t.benefitsJson as string[]) : [],
  }));

  if (tiers.length === 0) {
    return (
      <PublicShell orgName={org.orgName} title={`Become a member of ${org.orgName}`}>
        <p className="text-sm text-muted-foreground">No membership tiers are available right now.</p>
      </PublicShell>
    );
  }

  const template = await getActiveTemplate(org.orgId, 'MEMBER');

  return (
    <PublicShell
      orgName={org.orgName}
      title={`Become a member of ${org.orgName}`}
      subtitle="Join online in a minute — you'll get a receipt and an invitation to the member portal."
    >
      <PublicJoinForm
        handle={handle}
        applicationId={org.applicationId}
        locationId={org.locationId}
        orgName={org.orgName}
        tiers={tiers as PublicTier[]}
        templateFields={template?.fields ?? []}
      />
    </PublicShell>
  );
}
