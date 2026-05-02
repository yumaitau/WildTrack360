import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnrichedCarer } from "@/lib/carer-helpers";
import { getPhotoUrl } from "@/lib/photo-url";
import { prisma } from "@/lib/prisma";
import { canAccessAnimal } from "@/lib/rbac";
import { PrintButton } from "./print-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return { title: "Animal Detail Report - WildTrack360" };

  const animal = await prisma.animal.findFirst({
    where: { id, clerkOrganizationId: orgId },
    select: { name: true, species: true, carerId: true },
  });
  if (!animal) return { title: "Animal Detail Report - WildTrack360" };

  const allowed = await canAccessAnimal(userId, orgId, animal);
  if (!allowed) return { title: "Animal Detail Report - WildTrack360" };

  return { title: `Animal Detail Report - ${animal.name} - WildTrack360` };
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function field(label: string, value: React.ReactNode) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}

export default async function AnimalPrintReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) throw new Error("Organization ID is required");

  const animal = await prisma.animal.findFirst({
    where: { id, clerkOrganizationId: orgId },
    include: { carer: true },
  });
  if (!animal) notFound();

  const allowed = await canAccessAnimal(userId, orgId, animal);
  if (!allowed) redirect("/unauthorized");

  const [records, photos, releaseChecklist, latestGrowth, carer] = await Promise.all([
    prisma.record.findMany({
      where: { animalId: id, clerkOrganizationId: orgId },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.photo.findMany({
      where: { animalId: id, clerkOrganizationId: orgId },
      orderBy: { date: "desc" },
      take: 1,
    }),
    prisma.releaseChecklist.findFirst({
      where: { animalId: id, clerkOrganizationId: orgId },
      orderBy: { releaseDate: "desc" },
    }),
    prisma.growthMeasurement.findFirst({
      where: { animalId: id, clerkOrganizationId: orgId },
      orderBy: { date: "desc" },
    }),
    animal.carerId ? getEnrichedCarer(animal.carerId, orgId) : null,
  ]);

  const photoUrl = getPhotoUrl(photos[0]?.url ?? animal.photo);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-card { box-shadow: none !important; border-color: #d4d4d8 !important; break-inside: avoid; }
        }
      `}</style>

      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/animals/${animal.id}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Animal Detail Report</h1>
            <p className="text-sm text-muted-foreground">Printable summary for vet visits, transfers, and compliance files.</p>
          </div>
        </div>
        <PrintButton />
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm text-muted-foreground">WildTrack360 Animal Detail Report</div>
            <h2 className="text-3xl font-bold">{animal.name}</h2>
            <p className="text-lg text-muted-foreground">{animal.species}</p>
            {animal.orgAnimalId && <p className="font-mono text-sm">Animal ID: {animal.orgAnimalId}</p>}
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            Generated {formatDateTime(new Date())}
            <div className="mt-2">
              <Badge>{animal.status.replace(/_/g, " ")}</Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Animal Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field("Name", animal.name)}
                  {field("Species", animal.species)}
                  {field("Sex", animal.sex)}
                  {field("Age", animal.age || animal.ageClass)}
                  {field("Date found", formatDate(animal.dateFound))}
                  {field("Date of birth", formatDate(animal.dateOfBirth))}
                  {field("Date admitted", formatDate(animal.dateAdmitted))}
                  {field("Outcome", animal.outcome)}
                  {field("Outcome date", formatDate(animal.outcomeDate))}
                </dl>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <CardTitle>Current Carer</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {field("Name", carer?.name ?? "Unassigned")}
                  {field("Phone", carer?.phone)}
                  {field("Email", carer?.email)}
                  {field("Licence", carer?.licenseNumber)}
                </dl>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <CardTitle>NSW Compliance Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {field("Encounter type", animal.encounterType)}
                  {field("Condition", animal.animalCondition)}
                  {field("Initial weight", animal.initialWeightGrams ? `${animal.initialWeightGrams} g` : null)}
                  {field("Fate", animal.fate)}
                  {field("Life stage", animal.lifeStage)}
                  {field("Tag/Band", animal.tagBandColourNumber)}
                  {field("Microchip", animal.microchipNumber)}
                </dl>
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <CardTitle>Growth Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {latestGrowth ? (
                  <dl className="grid gap-4 sm:grid-cols-3">
                    {field("Latest measurement", formatDate(latestGrowth.date))}
                    {field("Weight", latestGrowth.weightGrams ? `${latestGrowth.weightGrams} g` : null)}
                    {field("Notes", latestGrowth.notes)}
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No growth measurements recorded.</p>
                )}
              </CardContent>
            </Card>

            <Card className="print-card">
              <CardHeader>
                <CardTitle>Locations</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Rescue</h3>
                  <p>{animal.rescueLocation || "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    {[animal.rescueAddress, animal.rescueSuburb, animal.rescuePostcode].filter(Boolean).join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold">Release</h3>
                  <p>{animal.releaseLocation || releaseChecklist?.releaseLocation || "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    {[animal.releaseAddress, animal.releaseSuburb, animal.releasePostcode].filter(Boolean).join(", ") || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(animal.dateReleased || releaseChecklist?.releaseDate)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4">
            <Card className="print-card">
              <CardHeader>
                <CardTitle>Photo</CardTitle>
              </CardHeader>
              <CardContent>
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={`Photo of ${animal.name}`} className="aspect-square w-full rounded-md border object-cover" />
                ) : (
                  <div className="aspect-square w-full rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground">
                    No photo
                  </div>
                )}
              </CardContent>
            </Card>
            {animal.notes && (
              <Card className="print-card">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{animal.notes}</p>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>

        <Card className="print-card">
          <CardHeader>
            <CardTitle>Recent Care Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b align-top">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(record.date)}</td>
                      <td className="py-2 pr-3">{record.type}</td>
                      <td className="py-2 pr-3">{record.description || "-"}</td>
                      <td className="py-2 pr-3">{record.notes || "-"}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No care records recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
