import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';

export default async function PreservedSpecimensPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) redirect('/sign-in');

  const specimens = await prisma.preservedSpecimen.findMany({
    where: { clerkOrganizationId: orgId },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/compliance">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Compliance
          </Link>
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold">Preserved Specimen Register</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Specimens</CardTitle>
          <CardDescription>
            NSW licence conditions require that every preserved specimen&apos;s register reference number
            physically accompany the specimen. Use the Print label button to generate a print-friendly
            card to attach to the container.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {specimens.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No preserved specimens have been recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4 font-semibold">Reference number</th>
                    <th className="py-2 pr-4 font-semibold">Species</th>
                    <th className="py-2 pr-4 font-semibold">Preservation date</th>
                    <th className="py-2 pr-4 font-semibold">Facility</th>
                    <th className="py-2 pr-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {specimens.map((s) => (
                    <tr key={s.id} className="border-b last:border-b-0">
                      <td className="py-2 pr-4 font-mono">{s.registerReferenceNumber}</td>
                      <td className="py-2 pr-4">{s.species}</td>
                      <td className="py-2 pr-4">
                        {s.preservationDate ? format(new Date(s.preservationDate), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-2 pr-4">{s.facilityName}</td>
                      <td className="py-2 pr-4 text-right">
                        <Link
                          href={`/compliance/preserved-specimens/${s.id}/label?print=1`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <Printer className="mr-2 h-4 w-4" />
                            Print label
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
