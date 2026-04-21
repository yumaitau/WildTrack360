import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import PrintControls from './auto-print';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}

export default async function PreservedSpecimenLabelPage({ params, searchParams }: PageProps) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const { id } = await params;
  const { print } = await searchParams;

  const specimen = await prisma.preservedSpecimen.findFirst({
    where: { id, clerkOrganizationId: orgId },
  });
  if (!specimen) notFound();

  const preservationDate = specimen.preservationDate
    ? format(new Date(specimen.preservationDate), 'dd MMMM yyyy')
    : '—';

  return (
    <>
      <style>{`
        /* Hide everything in the app shell except the label card when
           printing. The carer scans/sticks a single label per page onto the
           specimen container, so strip chrome to maximise legibility. */
        @media print {
          body * { visibility: hidden !important; }
          #specimen-label, #specimen-label * { visibility: visible !important; }
          #specimen-label {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>

      <div className="min-h-screen bg-neutral-50 p-8 flex items-center justify-center">
        <div className="w-full max-w-xl space-y-4 print:max-w-none">
          <PrintControls autoPrint={print === '1'} />

          <div
            id="specimen-label"
            className="rounded-lg border-2 border-neutral-900 bg-white p-10 shadow print:shadow-none"
          >
            <div className="mb-6 text-xs uppercase tracking-widest text-neutral-600">
              NSW Preserved Specimen — Register reference
            </div>

            <div className="mb-8 font-mono text-5xl font-bold tracking-tight text-neutral-900 break-all">
              {specimen.registerReferenceNumber}
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-base">
              <dt className="text-neutral-500">Species</dt>
              <dd className="font-medium text-neutral-900">{specimen.species}</dd>

              <dt className="text-neutral-500">Preservation date</dt>
              <dd className="font-medium text-neutral-900">{preservationDate}</dd>

              <dt className="text-neutral-500">Facility</dt>
              <dd className="font-medium text-neutral-900">{specimen.facilityName}</dd>
            </dl>

            <div className="mt-8 border-t pt-4 text-xs text-neutral-500">
              This label must physically accompany the specimen per NSW licence conditions.
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
