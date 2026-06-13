import { auth } from '@/lib/clerk-server';
import { redirect } from 'next/navigation';
import NSWReportClient from './nsw-report-client';
import { prisma } from '@/lib/prisma';
import { getEnrichedCarers } from '@/lib/carer-helpers';

export default async function NSWReportPage() {
  const { userId, orgId } = await auth();

  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  // Fetch initial data for the report. Advice-only call logs (action =
  // "Advice provided" with no linked animal) are unioned into the Datasheet
  // so NSW sees every encounter, not just physical rescues.
  const [animals, carers, adviceCallLogs, orgSettings] = await Promise.all([
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { dateFound: 'desc' }
    }),
    getEnrichedCarers(orgId),
    // Select only the fields the NSW Detailed Report needs. Caller PII
    // (name, phone, email) never leaves the server — the client-side report
    // generator only emits encounter metadata, so shipping it would be a
    // needless exposure.
    prisma.callLog.findMany({
      where: {
        clerkOrganizationId: orgId,
        animalId: null,
        action: { equals: 'Advice provided', mode: 'insensitive' },
      },
      orderBy: { dateTime: 'desc' },
      select: {
        id: true,
        dateTime: true,
        action: true,
        animalId: true,
        species: true,
        location: true,
        coordinates: true,
        suburb: true,
        postcode: true,
        takenByUserName: true,
        notes: true,
      },
    }),
    prisma.organisationSettings.findUnique({
      where: { clerkOrganisationId: orgId },
      select: { contactEmail: true, contactPhone: true, licenseNumber: true },
    }),
  ]);

  return (
    <NSWReportClient
      initialAnimals={animals}
      initialCarers={carers}
      initialAdviceCallLogs={adviceCallLogs}
      organizationId={orgId}
      orgDefaults={{
        contactEmail: orgSettings?.contactEmail ?? null,
        contactPhone: orgSettings?.contactPhone ?? null,
        licenseNumber: orgSettings?.licenseNumber ?? null,
      }}
    />
  );
}
