"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, AlertTriangle, CheckCircle, Download, Mail, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import jsPDF from 'jspdf';

interface CarerManagementClientProps {
  carers: any[];
}

export default function CarerManagementClient({ carers }: CarerManagementClientProps) {
  const getDaysUntilExpiry = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) return null;
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return 'no-license';
    const daysUntil = getDaysUntilExpiry(expiryDate);
    if (daysUntil === null) return 'no-license';
    if (daysUntil < 0) return 'expired';
    if (daysUntil <= 30) return 'expiring-soon';
    return 'valid';
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Carer Licence & CPD Tracker Report', pageWidth / 2, yPosition, { align: 'center' });
    
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
    
    const totalCarers = carers.length;
    const validLicences = carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'valid').length;
    const expiringSoon = carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expiring-soon').length;
    const expired = carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expired').length;
    const noLicense = carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'no-license').length;
    
    doc.text(`Total Active Carers: ${totalCarers}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`Valid Licences: ${validLicences}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`Expiring Soon (within 30 days): ${expiringSoon}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`Expired Licences: ${expired}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`No License Recorded: ${noLicense}`, margin + 10, yPosition);
    
    yPosition += 15;
    
    // Expiring Soon Section
    if (expiringSoon > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Licences Expiring Soon', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      carers
        .filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expiring-soon')
        .forEach((carer: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          const daysRemaining = getDaysUntilExpiry(carer.licenseExpiry);
          doc.text(`• ${carer.name || carer.fullName} - Licence #${carer.licenseNumber || 'N/A'} - ${daysRemaining} days remaining`, margin + 10, yPosition);
          yPosition += 6;
        });
      
      yPosition += 10;
    }
    
    // Expired Licences Section
    if (expired > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expired Licences (Immediate Action Required)', margin, yPosition);
      
      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      
      carers
        .filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expired')
        .forEach((carer: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          const daysOverdue = Math.abs(getDaysUntilExpiry(carer.licenseExpiry) || 0);
          doc.text(`• ${carer.name || carer.fullName} - Licence #${carer.licenseNumber || 'N/A'} - ${daysOverdue} days overdue`, margin + 10, yPosition);
          yPosition += 6;
        });
      
      yPosition += 10;
    }
    
    // Carer Details Table
    doc.addPage();
    yPosition = 20;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Carer Details', margin, yPosition);
    
    yPosition += 10;
    doc.setFontSize(8);
    
    // Table headers
    const headers = ['Name', 'Licence #', 'Expiry', 'Status', 'Specialties'];
    const colWidths = [40, 30, 25, 25, 50];
    let xPos = margin;
    
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });
    
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    
    // Table data
    carers.forEach((carer: any) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
        
        // Repeat headers
        xPos = margin;
        doc.setFont('helvetica', 'bold');
        headers.forEach((header, index) => {
          doc.text(header, xPos, yPosition);
          xPos += colWidths[index];
        });
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
      }
      
      xPos = margin;
      const status = getExpiryStatus(carer.licenseExpiry);
      
      doc.text(carer.name || carer.fullName || 'Unknown', xPos, yPosition);
      xPos += colWidths[0];
      doc.text(carer.licenseNumber || carer.licenceNumber || 'N/A', xPos, yPosition);
      xPos += colWidths[1];
      doc.text(carer.licenseExpiry || 'Not recorded', xPos, yPosition);
      xPos += colWidths[2];
      doc.text(
        status === 'valid' ? 'Valid' :
        status === 'expiring-soon' ? 'Expiring' :
        status === 'expired' ? 'Expired' :
        'No License',
        xPos, yPosition
      );
      xPos += colWidths[3];
      const specialties = carer.specialties || [];
      doc.text(specialties.length > 0 ? specialties.slice(0, 2).join(', ') : 'None', xPos, yPosition);
      
      yPosition += 5;
    });
    
    // Footer
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('This report was generated automatically by WildTrack360 Compliance System.', margin, yPosition);
    yPosition += 7;
    doc.text('For questions or concerns, please contact your compliance coordinator.', margin, yPosition);
    yPosition += 14;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Requirements:', margin, yPosition);
    yPosition += 7;
    doc.setFont('helvetica', 'normal');
    doc.text('• All carers must maintain valid wildlife carer licences', margin, yPosition);
    yPosition += 5;
    doc.text('• Licences must be renewed before expiry date', margin, yPosition);
    yPosition += 5;
    doc.text('• Carers with expired licences must not handle wildlife', margin, yPosition);
    yPosition += 5;
    doc.text('• Species-specific training is required for specialisations', margin, yPosition);
    
    // Save the PDF
    doc.save(`carer-licences-${new Date().toISOString().split('T')[0]}.pdf`);
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
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
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
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Link href="/compliance/carers/training">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Training Certificates
            </Button>
          </Link>
          <span className="text-sm text-muted-foreground">
            Add carers via Admin &gt; Manage Users
          </span>
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
              {carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'valid').length}
            </div>
            <div className="text-sm text-muted-foreground">Valid Licences</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expiring-soon').length}
            </div>
            <div className="text-sm text-muted-foreground">Expiring Soon</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expired').length}
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
              {carers.map((carer: any) => {
                const expiryStatus = getExpiryStatus(carer.licenseExpiry);
                const daysUntil = getDaysUntilExpiry(carer.licenseExpiry);
                
                return (
                  <TableRow key={carer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{carer.fullName || carer.name}</div>
                        <div className="text-sm text-muted-foreground">{carer.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {carer.licenceNumber || carer.licenseNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{carer.licenseExpiry || 'No license recorded'}</div>
                        {expiryStatus !== 'valid' && expiryStatus !== 'no-license' && daysUntil !== null && (
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
                      {expiryStatus === 'no-license' ? (
                        <Badge variant="outline" className="text-xs">
                          No License
                        </Badge>
                      ) : expiryStatus === 'valid' ? (
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
                        {carer.specialties && carer.specialties.length > 0 ? (
                          <>
                            {carer.specialties.slice(0, 2).map((specialty: any, index: any) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {carer.specialties.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{carer.specialties.length - 2} more
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">No specialties</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{carer.trainings?.length || 0} courses</div>
                        {carer.trainings && carer.trainings.length > 0 && (
                          <div className="text-muted-foreground">
                            Latest: {carer.trainings[0]?.courseName || 'Unknown'}
                          </div>
                        )}
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
      {carers.filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expiring-soon').length > 0 && (
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
                .filter((c: any) => getExpiryStatus(c.licenseExpiry) === 'expiring-soon')
                .map((carer: any) => (
                  <div key={carer.id} className="flex items-center justify-between p-2 bg-white rounded">
                    <div>
                      <span className="font-medium">{carer.fullName || carer.name}</span>
                      <span className="text-muted-foreground ml-2">
                        expires {carer.licenseExpiry} ({getDaysUntilExpiry(carer.licenseExpiry)} days)
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