"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Calendar, CheckCircle, XCircle, Download, Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import { getHygieneLogs, getUsers } from "@/lib/data";
import Link from "next/link";
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';

export default function HygieneLogPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [hygieneLogs, users] = await Promise.all([
          getHygieneLogs(),
          getUsers()
        ]);
        setData({ hygieneLogs, users });
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading hygiene data...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error loading data</div>
        </div>
      </div>
    );
  }

  const { hygieneLogs, users } = data;

  const getCarerName = (carerId: string) => {
    const carer = users.find((u: any) => u.id === carerId);
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
          <Button 
            variant="outline"
            onClick={() => {
              // Generate CSV export
              const csvContent = [
                ['Date', 'Carer', 'Enclosure Cleaned', 'PPE Used', 'Handwash Available', 'Bowls Disinfected', 'Quarantine Signs', 'Compliance Score', 'Notes'],
                ...hygieneLogs.map((log: any) => {
                  const complianceScore = getComplianceScore(log);
                  return [
                    log.date,
                    getCarerName(log.carerId),
                    log.enclosureCleaned ? 'Yes' : 'No',
                    log.ppeUsed ? 'Yes' : 'No',
                    log.handwashAvailable ? 'Yes' : 'No',
                    log.feedingBowlsDisinfected ? 'Yes' : 'No',
                    log.quarantineSignsPresent ? 'Yes' : 'No',
                    `${complianceScore}%`,
                    log.notes || ''
                  ];
                })
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hygiene-logs-${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              // Generate PDF export
              const doc = new jsPDF();
              const pageWidth = doc.internal.pageSize.getWidth();
              const margin = 20;
              let yPosition = 20;
              
              // Header
              doc.setFontSize(20);
              doc.setFont('helvetica', 'bold');
              doc.text('Daily Hygiene & Biosecurity Log Report', pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 15;
              doc.setFontSize(12);
              doc.setFont('helvetica', 'normal');
              doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
              
              yPosition += 20;
              
              // Statistics
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Summary Statistics', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              
              const totalEntries = hygieneLogs.length;
              const fullyCompliant = hygieneLogs.filter((log: any) => getComplianceScore(log) === 100).length;
              const mostlyCompliant = hygieneLogs.filter((log: any) => {
                const score = getComplianceScore(log);
                return score >= 80 && score < 100;
              }).length;
              const nonCompliant = hygieneLogs.filter((log: any) => getComplianceScore(log) < 80).length;
              
              doc.text(`Total Log Entries: ${totalEntries}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Fully Compliant: ${fullyCompliant}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Mostly Compliant: ${mostlyCompliant}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Non-Compliant: ${nonCompliant}`, margin + 10, yPosition);
              
              yPosition += 15;
              
              // Log entries table
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Hygiene Log Entries', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              
              // Table headers
              const headers = ['Date', 'Carer', 'Score', 'Status'];
              const colWidths = [30, 50, 20, 30];
              let xPos = margin;
              
              headers.forEach((header, index) => {
                doc.setFont('helvetica', 'bold');
                doc.text(header, xPos, yPosition);
                xPos += colWidths[index];
              });
              
              yPosition += 5;
              
              // Table data
              hygieneLogs.slice(0, 20).forEach((log: any) => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }
                
                const complianceScore = getComplianceScore(log);
                const complianceStatus = getComplianceStatus(complianceScore);
                
                xPos = margin;
                doc.setFont('helvetica', 'normal');
                doc.text(log.date, xPos, yPosition);
                xPos += colWidths[0];
                doc.text(getCarerName(log.carerId), xPos, yPosition);
                xPos += colWidths[1];
                doc.text(`${complianceScore}%`, xPos, yPosition);
                xPos += colWidths[2];
                doc.text(complianceStatus, xPos, yPosition);
                
                yPosition += 5;
              });
              
              if (hygieneLogs.length > 20) {
                yPosition += 5;
                doc.text(`... and ${hygieneLogs.length - 20} more entries`, margin, yPosition);
              }
              
              // Footer
              doc.addPage();
              yPosition = 20;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'italic');
              doc.text('This report was generated automatically by WildHub Compliance System.', margin, yPosition);
              yPosition += 7;
              doc.text('For questions or concerns, please contact your compliance coordinator.', margin, yPosition);
              
              // Save the PDF
              doc.save(`hygiene-logs-${new Date().toISOString().split('T')[0]}.pdf`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
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
              {hygieneLogs.filter((log: any) => getComplianceScore(log) === 100).length}
            </div>
            <div className="text-sm text-muted-foreground">Fully Compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {hygieneLogs.filter((log: any) => {
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
              {hygieneLogs.filter((log: any) => getComplianceScore(log) < 80).length}
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
              {hygieneLogs.map((log: any) => {
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
                  .filter((log: any) => log.date === new Date().toISOString().split('T')[0])
                  .map((log: any) => {
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
                {hygieneLogs.filter((log: any) => log.date === new Date().toISOString().split('T')[0]).length === 0 && (
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
                  const dayLogs = hygieneLogs.filter((log: any) => {
                    const logDate = new Date(log.date);
                    const dayName = logDate.toLocaleDateString('en-US', { weekday: 'long' });
                    return dayName === day;
                  });
                  const avgScore = dayLogs.length > 0 
                    ? Math.round(dayLogs.reduce((sum: number, log: any) => sum + getComplianceScore(log), 0) / dayLogs.length)
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