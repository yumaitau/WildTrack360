import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, AlertTriangle, CheckCircle, Download, Plus, Mail, ArrowLeft } from "lucide-react";
import { getUsers } from "@/lib/data";
import Link from "next/link";

export default async function CarerManagementPage() {
  const users = await getUsers();
  const carers = users.filter(user => user.role === 'Carer');

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate: string) => {
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring-soon';
    return 'valid';
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
            <h1 className="text-3xl font-bold">Carer Licence & CPD Tracker</h1>
            <p className="text-muted-foreground">
              Manage licences and continuing professional development
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Link href="/compliance/carers/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Carer
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{carers.length}</div>
            <div className="text-sm text-muted-foreground">Active Carers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {carers.filter(c => getExpiryStatus(c.licenceExpiry || '') === 'valid').length}
            </div>
            <div className="text-sm text-muted-foreground">Valid Licences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {carers.filter(c => getExpiryStatus(c.licenceExpiry || '') === 'expiring-soon').length}
            </div>
            <div className="text-sm text-muted-foreground">Expiring Soon</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {carers.filter(c => getExpiryStatus(c.licenceExpiry || '') === 'expired').length}
            </div>
            <div className="text-sm text-muted-foreground">Expired</div>
          </CardContent>
        </Card>
      </div>

      {/* Carers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Carer Management</CardTitle>
          <CardDescription>
            Complete record of all licensed carers and their training history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Licence Number</TableHead>
                <TableHead>Licence Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Authorised Species</TableHead>
                <TableHead>Training Courses</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carers.map((carer) => {
                const expiryStatus = getExpiryStatus(carer.licenceExpiry || '');
                const daysUntil = getDaysUntilExpiry(carer.licenceExpiry || '');
                
                return (
                  <TableRow key={carer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{carer.fullName}</div>
                        <div className="text-sm text-muted-foreground">{carer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {carer.licenceNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{carer.licenceExpiry}</div>
                        {expiryStatus !== 'valid' && (
                          <div className="text-sm text-muted-foreground">
                            {expiryStatus === 'expired' 
                              ? `${Math.abs(daysUntil)} days overdue`
                              : `${daysUntil} days remaining`
                            }
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {expiryStatus === 'valid' ? (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      ) : expiryStatus === 'expiring-soon' ? (
                        <Badge variant="outline" className="text-xs text-orange-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {carer.authorisedSpecies.slice(0, 2).map((species, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {species}
                          </Badge>
                        ))}
                        {carer.authorisedSpecies.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{carer.authorisedSpecies.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{carer.trainingHistory.length} courses</div>
                        <div className="text-muted-foreground">
                          Latest: {carer.trainingHistory[0]?.courseName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link href={`/compliance/carers/${carer.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        {expiryStatus === 'expiring-soon' && (
                          <Button variant="outline" size="sm">
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Alerts for Expiring Licences */}
      {carers.filter(c => getExpiryStatus(c.licenceExpiry || '') === 'expiring-soon').length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Licences Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {carers
                .filter(c => getExpiryStatus(c.licenceExpiry || '') === 'expiring-soon')
                .map(carer => (
                  <div key={carer.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{carer.fullName}</span>
                      <span className="text-muted-foreground ml-2">
                        expires {carer.licenceExpiry} ({getDaysUntilExpiry(carer.licenceExpiry || '')} days)
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Reminder
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Compliance Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Licence Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Licence Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Valid wildlife carer licence from ACT Government</li>
                <li>• Licence must be renewed before expiry</li>
                <li>• 30-day reminder notifications</li>
                <li>• Automatic suspension of expired licences</li>
                <li>• Record of all licence renewals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Authorised Species</h4>
              <div className="text-sm text-muted-foreground">
                <p>Carers are only authorised to care for species listed on their licence.</p>
                <p className="mt-2">
                  <strong>Note:</strong> Caring for unauthorised species requires 
                  immediate notification to authorities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Continuing Professional Development
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Training Requirements</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Foundation course completion required</li>
                <li>• Species-specific training for specialisations</li>
                <li>• Annual refresher training recommended</li>
                <li>• Record of all training certificates</li>
                <li>• Training expiry tracking</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Training Providers</h4>
              <div className="text-sm text-muted-foreground">
                <p><strong>Approved Providers:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• ACT Wildlife</li>
                  <li>• Wildlife Health Australia</li>
                  <li>• Australian Koala Foundation</li>
                  <li>• BirdLife Australia</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 