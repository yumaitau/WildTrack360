import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  User, 
  Calendar, 
  Download, 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  FileText,
  Award,
  Shield,
  Home
} from "lucide-react";
import { getUsers, getAnimals } from "@/lib/data-store";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CarerDetailPageProps {
  params: {
    id: string;
  };
}

export default async function CarerDetailPage({ params }: CarerDetailPageProps) {
  const users = await getUsers();
  const animals = await getAnimals();

  const carer = users.find(u => u.id === params.id);
  
  if (!carer) {
    notFound();
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysUntilExpiry = getDaysUntilExpiry(carer.licenceExpiry || '');
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  const carerAnimals = animals.filter(a => a.carerId === carer.id);
  const animalsInCare = carerAnimals.filter(a => a.status === 'In Care');
  const releasedAnimals = carerAnimals.filter(a => a.status === 'Released');

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
            <Link href="/compliance/carers">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">{carer.fullName}</h1>
            <p className="text-muted-foreground">
              {carer.role} • {carer.licenceNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Reminder
          </Button>
          <Link href={`/compliance/carers/${carer.id}/edit`}>
            <Button>Edit Carer</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Licence Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Licence Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Licence Number</label>
                  <p className="text-lg font-mono">{carer.licenceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Role</label>
                  <Badge variant="outline" className="text-sm">
                    {carer.role}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expiry Date</label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">{carer.licenceExpiry}</p>
                    {isExpired ? (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="h-3 w-3 mr-1" />
                        Expired
                      </Badge>
                    ) : isExpiringSoon ? (
                      <Badge variant="outline" className="text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {daysUntilExpiry} days
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                  <Badge variant="outline" className="text-sm">
                    {carer.jurisdiction}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorised Species */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Authorised Species
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {carer.authorisedSpecies.map((species, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {species}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Carer is authorised to care for the above species only. 
                Caring for unauthorised species requires immediate notification to authorities.
              </p>
            </CardContent>
          </Card>

          {/* Training History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Training History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carer.trainingHistory.map((training) => {
                    const isExpired = training.expiryDate && new Date(training.expiryDate) < new Date();
                    const isExpiringSoon = training.expiryDate && 
                      new Date(training.expiryDate) > new Date() && 
                      new Date(training.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={training.id}>
                        <TableCell className="font-medium">{training.courseName}</TableCell>
                        <TableCell>{training.provider}</TableCell>
                        <TableCell>{training.date}</TableCell>
                        <TableCell>
                          {training.expiryDate ? (
                            <div className="flex items-center gap-2">
                              <span>{training.expiryDate}</span>
                              {isExpired ? (
                                <Badge variant="destructive" className="text-xs">
                                  Expired
                                </Badge>
                              ) : isExpiringSoon ? (
                                <Badge variant="outline" className="text-xs text-orange-600">
                                  Soon
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  Valid
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {training.certificateUrl ? (
                            <Button variant="outline" size="sm">
                              <Download className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">No certificate</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Current Animals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current Animals in Care
              </CardTitle>
            </CardHeader>
            <CardContent>
              {animalsInCare.length > 0 ? (
                <div className="space-y-3">
                  {animalsInCare.map((animal) => (
                    <div key={animal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{animal.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {animal.species} • {animal.ageClass}
                        </div>
                      </div>
                      <Link href={`/animals/${animal.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No animals currently in care</p>
              )}
            </CardContent>
          </Card>
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
                  <span className="text-sm">Licence Status</span>
                  {isExpired ? (
                    <XCircle className="h-4 w-4 text-red-600" />
                  ) : isExpiringSoon ? (
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Training Current</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Species Authorised</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documentation</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </div>
              
              <Separator />
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-green-600'}`}>
                  {isExpired ? '0%' : isExpiringSoon ? '75%' : '100%'}
                </div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{animalsInCare.length}</div>
                  <div className="text-sm text-muted-foreground">In Care</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{releasedAnimals.length}</div>
                  <div className="text-sm text-muted-foreground">Released</div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{carer.trainingHistory.length}</div>
                <div className="text-sm text-muted-foreground">Training Courses</div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{carer.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Licence Number</label>
                <p className="font-mono text-sm">{carer.licenceNumber}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                <p className="text-sm">{carer.jurisdiction}</p>
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
                <Mail className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Renewal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 