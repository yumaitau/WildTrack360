import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import NSWReportClient from './nsw-report-client';
import { prisma } from '@/lib/prisma';

export default async function NSWReportPage() {
  const { userId, orgId } = await auth();
  
  if (!userId || !orgId) {
    redirect('/sign-in');
  }

  // Fetch initial data for the report
  const [animals, carers] = await Promise.all([
    prisma.animal.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { dateFound: 'desc' }
    }),
    prisma.carer.findMany({
      where: { clerkOrganizationId: orgId },
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <NSWReportClient 
      initialAnimals={animals}
      initialCarers={carers}
      organizationId={orgId}
    />
  );
}