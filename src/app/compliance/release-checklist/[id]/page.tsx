import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  MapPin, 
  Calendar, 
  Download, 
  ArrowLeft, 
  AlertTriangle,
  User,
  FileText,
  Image as ImageIcon,
  Home
} from "lucide-react";
import { getReleaseChecklists, getAnimals, getUsers } from "@/lib/data";
import Link from "next/link";
import { notFound } from "next/navigation";

interface ReleaseChecklistDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ReleaseChecklistDetailPage({ params }: ReleaseChecklistDetailPageProps) {
  const releaseChecklists = await getReleaseChecklists();
  const animals = await getAnimals();
  const users = await getUsers();

  const checklist = releaseChecklists.find(r => r.id === params.id);
  
  if (!checklist) {
    notFound();
  }

  const animal = animals.find(a => a.animalId === checklist.animalId);
  const vet = users.find(u => u.fullName === checklist.vetSignOff.name);

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/compliance/release-checklist">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Release Checklist</h1>
            <p className="text-muted-foreground">
              {animal?.name} ({animal?.species}) - {checklist.releaseDate}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button>Edit Checklist</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Animal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Animal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Animal Name</label>
                  <p className="text-lg font-medium">{animal?.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Species</label>
                  <p className="text-lg">{animal?.species}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Animal ID</label>
                  <p className="font-mono text-sm">{checklist.animalId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Age Class</label>
                  <Badge variant="outline">{animal?.ageClass}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Release Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Release Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Release Date</label>
                  <p className="text-lg font-medium">{checklist.releaseDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Release Type</label>
                  <Badge 
                    variant={
                      checklist.releaseType === 'Soft' ? 'default' :
                      checklist.releaseType === 'Hard' ? 'secondary' : 'outline'
                    }
                    className="text-sm"
                  >
                    {checklist.releaseType}
                  </Badge>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Release Location</label>
                <p className="text-lg">{checklist.releaseLocation}</p>
                {checklist.releaseCoordinates && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Coordinates: {checklist.releaseCoordinates.lat}, {checklist.releaseCoordinates.lng}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Distance Check</label>
                <div className="flex items-center gap-2 mt-1">
                  {checklist.within10km ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600 font-medium">Within 10km of rescue location</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="text-orange-600 font-medium">Outside 10km - justification required</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fitness Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Fitness Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Fitness Indicators</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {checklist.fitnessIndicators.map((indicator, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{indicator}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {checklist.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assessment Notes</label>
                    <p className="text-sm mt-1">{checklist.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Veterinary Sign-off */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Veterinary Sign-off
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Veterinarian</label>
                    <p className="font-medium">{checklist.vetSignOff.name}</p>
                    {vet && (
                      <p className="text-sm text-muted-foreground">{vet.licenceNumber}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sign-off Date</label>
                    <p className="font-medium">{checklist.vetSignOff.date}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Signature</label>
                  <div className="mt-2 p-3 bg-gray-50 rounded border">
                    <p className="font-mono text-sm">{checklist.vetSignOff.signature}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {checklist.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Release Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.photos.map((photo, index) => (
                    <div key={index} className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      <img 
                        src={photo} 
                        alt={`Release photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Distance Check</span>
                  {checklist.within10km ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vet Sign-off</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fitness Assessment</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documentation</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">100%</div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
            </CardContent>
          </Card>

          {/* ACT Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>ACT Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.1 - Release site selection</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.2 - Pre-release assessment</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Section 6.3 - Release procedures</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Print Checklist
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Follow-up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 