import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Calendar, CheckCircle, XCircle, Download, Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import { getHygieneLogs, getUsers } from "@/lib/data";
import Link from "next/link";

export default async function HygieneLogPage() {
  const hygieneLogs = await getHygieneLogs();
  const users = await getUsers();

  const getCarerName = (carerId: string) => {
    const carer = users.find(u => u.id === carerId);
    return carer?.fullName || 'Unknown';
  };

  const getComplianceScore = (log: any) => {
    const checks = [
      log.enclosureCleaned,
      log.ppeUsed,
      log.handwashAvailable,
      log.feedingBowlsDisinfected,
      log.quarantineSignsPresent
    ];
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  };

  const getComplianceStatus = (score: number) => {
    if (score === 100) return 'compliant';
    if (score >= 80) return 'mostly-compliant';
    return 'non-compliant';
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
            <h1 className="text-3xl font-bold">Daily Hygiene & Biosecurity Log</h1>
            <p className="text-muted-foreground">
              Section 5.2.x - Daily cleaning and biosecurity protocols
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Weekly Report
          </Button>
          <Link href="/compliance/hygiene/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Log Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{hygieneLogs.length}</div>
            <div className="text-sm text-muted-foreground">Total Log Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {hygieneLogs.filter(log => getComplianceScore(log) === 100).length}
            </div>
            <div className="text-sm text-muted-foreground">Fully Compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {hygieneLogs.filter(log => {
                const score = getComplianceScore(log);
                return score >= 80 && score < 100;
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Mostly Compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {hygieneLogs.filter(log => getComplianceScore(log) < 80).length}
            </div>
            <div className="text-sm text-muted-foreground">Non-Compliant</div>
          </CardContent>
        </Card>
      </div>

      {/* Hygiene Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hygiene Logs</CardTitle>
          <CardDescription>
            Daily cleaning and biosecurity compliance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Carer</TableHead>
                <TableHead>Enclosure Cleaned</TableHead>
                <TableHead>PPE Used</TableHead>
                <TableHead>Handwash Available</TableHead>
                <TableHead>Bowls Disinfected</TableHead>
                <TableHead>Quarantine Signs</TableHead>
                <TableHead>Compliance Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hygieneLogs.map((log) => {
                const complianceScore = getComplianceScore(log);
                const complianceStatus = getComplianceStatus(complianceScore);
                
                return (
                  <TableRow key={log.id}>
                    <TableCell>{log.date}</TableCell>
                    <TableCell>{getCarerName(log.carerId)}</TableCell>
                    <TableCell>
                      {log.enclosureCleaned ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.ppeUsed ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.handwashAvailable ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.feedingBowlsDisinfected ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      {log.quarantineSignsPresent ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          complianceStatus === 'compliant' ? 'secondary' :
                          complianceStatus === 'mostly-compliant' ? 'outline' : 'destructive'
                        }
                        className="text-xs"
                      >
                        {complianceScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/compliance/hygiene/${log.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Today's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Compliance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-4">Today's Entries</h4>
              <div className="space-y-3">
                {hygieneLogs
                  .filter(log => log.date === new Date().toISOString().split('T')[0])
                  .map(log => {
                    const complianceScore = getComplianceScore(log);
                    const complianceStatus = getComplianceStatus(complianceScore);
                    
                    return (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{getCarerName(log.carerId)}</div>
                          <div className="text-sm text-muted-foreground">
                            {log.notes || 'No notes provided'}
                          </div>
                        </div>
                        <Badge 
                          variant={
                            complianceStatus === 'compliant' ? 'secondary' :
                            complianceStatus === 'mostly-compliant' ? 'outline' : 'destructive'
                          }
                        >
                          {complianceScore}%
                        </Badge>
                      </div>
                    );
                  })}
                {hygieneLogs.filter(log => log.date === new Date().toISOString().split('T')[0]).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No entries for today
                  </div>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Weekly Compliance Trend</h4>
              <div className="space-y-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const dayLogs = hygieneLogs.filter(log => {
                    const logDate = new Date(log.date);
                    const dayName = logDate.toLocaleDateString('en-US', { weekday: 'long' });
                    return dayName === day;
                  });
                  const avgScore = dayLogs.length > 0 
                    ? Math.round(dayLogs.reduce((sum, log) => sum + getComplianceScore(log), 0) / dayLogs.length)
                    : 0;
                  
                  return (
                    <div key={day} className="flex items-center justify-between">
                      <span className="text-sm">{day}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${avgScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{avgScore}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Daily Hygiene Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Section 5.2.x - Daily Protocols</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All enclosures cleaned and disinfected daily</li>
                <li>• Appropriate PPE worn during cleaning</li>
                <li>• Handwashing facilities available and used</li>
                <li>• Feeding bowls and equipment disinfected</li>
                <li>• Quarantine area signs clearly displayed</li>
                <li>• Waste disposed of appropriately</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Compliance Scoring</h4>
              <div className="text-sm text-muted-foreground">
                <p><strong>100%:</strong> All requirements met</p>
                <p><strong>80-99%:</strong> Minor issues, corrective action needed</p>
                <p><strong>&lt;80%:</strong> Major compliance issues, immediate action required</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Biosecurity Protocols
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Disease Prevention</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Quarantine new animals for minimum 14 days</li>
                <li>• Separate equipment for different species</li>
                <li>• Regular disinfection of all surfaces</li>
                <li>• Proper waste management procedures</li>
                <li>• Visitor restrictions in quarantine areas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Reporting Requirements</h4>
              <div className="text-sm text-muted-foreground">
                <p>• Daily logs must be completed by each carer</p>
                <p>• Weekly reports generated for management</p>
                <p>• Non-compliance incidents reported immediately</p>
                <p>• Annual biosecurity audit required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 