import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, MapPin, Calendar, Download, Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import { getReleaseChecklists, getAnimals } from "@/lib/data";
import Link from "next/link";

export default async function ReleaseChecklistPage() {
  const releaseChecklists = await getReleaseChecklists();
  const animals = await getAnimals();

  const getAnimalName = (animalId: string) => {
    const animal = animals.find(a => a.animalId === animalId);
    return animal?.name || 'Unknown';
  };

  const getAnimalSpecies = (animalId: string) => {
    const animal = animals.find(a => a.animalId === animalId);
    return animal?.species || 'Unknown';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Release Site Checklist</h1>
            <p className="text-muted-foreground">
              Section 6.1 – 6.3 - Ensure ethical and ecologically sound releases
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Link href="/compliance/release-checklist/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Release
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{releaseChecklists.length}</div>
            <div className="text-sm text-muted-foreground">Total Releases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {releaseChecklists.filter(r => r.within10km).length}
            </div>
            <div className="text-sm text-muted-foreground">Within 10km</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {releaseChecklists.filter(r => r.releaseType === 'Soft').length}
            </div>
            <div className="text-sm text-muted-foreground">Soft Releases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {releaseChecklists.filter(r => r.releaseType === 'Hard').length}
            </div>
            <div className="text-sm text-muted-foreground">Hard Releases</div>
          </CardContent>
        </Card>
      </div>

      {/* Release Checklists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Release Checklists</CardTitle>
          <CardDescription>
            Complete record of all wildlife releases with compliance verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>Release Location</TableHead>
                <TableHead>Distance Check</TableHead>
                <TableHead>Release Type</TableHead>
                <TableHead>Fitness Indicators</TableHead>
                <TableHead>Vet Sign-off</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releaseChecklists.map((checklist) => (
                <TableRow key={checklist.id}>
                  <TableCell className="font-medium">
                    {getAnimalName(checklist.animalId)}
                  </TableCell>
                  <TableCell>{getAnimalSpecies(checklist.animalId)}</TableCell>
                  <TableCell>{checklist.releaseDate}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {checklist.releaseLocation}
                  </TableCell>
                  <TableCell>
                    {checklist.within10km ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Within 10km
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Outside 10km
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        checklist.releaseType === 'Soft' ? 'default' :
                        checklist.releaseType === 'Hard' ? 'secondary' : 'outline'
                      }
                      className="text-xs"
                    >
                      {checklist.releaseType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {checklist.fitnessIndicators.slice(0, 2).map((indicator, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {indicator}
                        </Badge>
                      ))}
                      {checklist.fitnessIndicators.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{checklist.fitnessIndicators.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div className="font-medium">{checklist.vetSignOff.name}</div>
                      <div className="text-muted-foreground">{checklist.vetSignOff.date}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/compliance/release-checklist/${checklist.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Release Site Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Section 6.1 - Release Site Selection</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Release within 10km of rescue location where possible</li>
                <li>• Suitable habitat for the species</li>
                <li>• Adequate food and water sources</li>
                <li>• Minimal human disturbance</li>
                <li>• Appropriate shelter and protection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Distance Verification</h4>
              <div className="text-sm text-muted-foreground">
                <p>GPS coordinates are automatically checked against rescue location.</p>
                <p className="mt-2">
                  <strong>Current ACT Policy:</strong> Releases within 10km are preferred, 
                  exceptions require documented justification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Fitness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Section 6.2 - Pre-release Assessment</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Normal weight for age and species</li>
                <li>• Avoids human contact appropriately</li>
                <li>• Good coordination and movement</li>
                <li>• Forages independently</li>
                <li>• No signs of illness or injury</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Veterinary Sign-off</h4>
              <div className="text-sm text-muted-foreground">
                <p><strong>Required for:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Juvenile animals</li>
                                     <li>• Animals in care &gt; 30 days</li>
                  <li>• Animals with previous injuries</li>
                  <li>• Endangered species</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Release Types Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Release Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Hard Release</h4>
              <p className="text-sm text-muted-foreground">
                Direct release into the wild. Suitable for healthy adult animals 
                that have been in care for short periods.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Soft Release</h4>
              <p className="text-sm text-muted-foreground">
                Gradual release with monitoring. Animals are placed in a release 
                pen or monitored area before full release.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Passive Release</h4>
              <p className="text-sm text-muted-foreground">
                Natural dispersal from a release site. Used for species that 
                naturally disperse or migrate.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 