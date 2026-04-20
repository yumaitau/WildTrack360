import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import NSWReportClient from './nsw-report-client';
import { prisma } from '@/lib/prisma';
import { getEnrichedCarers } from '@/lib/carer-helpers';

export default async function NSWReportPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  // Fetch initial data for the report
  const [animals, carers, orgSettings] = await Promise.all([
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { dateFound: 'desc' }
    }),
    getEnrichedCarers(orgId),
    prisma.organisationSettings.findUnique({
      where: { clerkOrganisationId: orgId },
      select: { contactEmail: true, contactPhone: true, licenseNumber: true },
    }),
  ]);

  return (
    <NSWReportClient
      initialAnimals={animals}
      initialCarers={carers}
      organizationId={orgId}
      orgDefaults={{
        contactEmail: orgSettings?.contactEmail ?? null,
        contactPhone: orgSettings?.contactPhone ?? null,
        licenseNumber: orgSettings?.licenseNumber ?? null,
      }}
    />
  );
}
