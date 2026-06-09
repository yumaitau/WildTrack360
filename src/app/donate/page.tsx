import { headers } from 'next/headers';
import { extractSubdomain } from '@/lib/subdomain';
import { resolvePublicOrg } from '@/lib/public-org';
import { PublicShell } from '@/components/public/public-shell';
import { PublicDonateForm } from '@/components/public/public-donate-form';

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000';

// Public, no-login donation page served on the org subdomain
// ({org}.wildtrack360.com.au/donate). The org is resolved from the subdomain.
export default async function DonatePage() {
  const host = (await headers()).get('host') ?? '';
  const handle = extractSubdomain(host, ROOT_DOMAIN);
  const org = handle ? await resolvePublicOrg(handle) : null;

  if (!org || !handle) {
    return (
      <PublicShell
        title="Donations unavailable"
        subtitle="This organisation isn't set up to accept donations yet."
      >
        <p className="text-sm text-muted-foreground">Please check back later.</p>
      </PublicShell>
    );
  }

  return (
    <PublicShell
      orgName={org.orgName}
      title={`Support ${org.orgName}`}
      subtitle="Make a secure one-off donation. A receipt is emailed to you straight away."
    >
      <PublicDonateForm
        handle={handle}
        applicationId={org.applicationId}
        locationId={org.locationId}
        orgName={org.orgName}
      />
    </PublicShell>
  );
}
