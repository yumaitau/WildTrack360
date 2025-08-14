import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { notFound } from "next/navigation";
import IncidentDetailClient from './incident-detail-client';

interface IncidentReportDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function IncidentReportDetailPage({ params }: IncidentReportDetailPageProps) {
  const { id } = await params;
  const { userId, orgId } = await auth()
  if (!userId || !orgId) notFound()

  const incident = await prisma.incidentReport.findFirst({
    where: { id: id, clerkOrganizationId: orgId },
  })
  if (!incident) notFound()

  const animal = incident.animalId
    ? await prisma.animal.findFirst({ where: { id: incident.animalId, clerkOrganizationId: orgId } })
    : null

  return <IncidentDetailClient incident={incident} animal={animal} />;
} 