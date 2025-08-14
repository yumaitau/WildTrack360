"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, MapPin, Calendar, Download, Plus, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';
import { getCurrentJurisdiction, getJurisdictionConfig } from '@/lib/config';

export default function ReleaseChecklistPage() {
  const [releaseChecklists, setReleaseChecklists] = useState<any[]>([]);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { organization } = useOrganization();
  const jurisdiction = getCurrentJurisdiction();
  const config = getJurisdictionConfig();

  useEffect(() => {
    async function loadData() {
      try {
        if (!organization) return;
        const orgId = organization.id;
        const [checklists, animalsData] = await Promise.all([
          fetch(`/api/release-checklists?orgId=${orgId}`).then(r => r.json()),
          fetch(`/api/animals?orgId=${orgId}`).then(r => r.json()),
        ]);
        setReleaseChecklists(checklists);
        setAnimals(animalsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [organization]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading release checklists...</div>
        </div>
      </div>
    );
  }

  const getAnimalName = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.name : 'Unknown Animal';
  };

  const getAnimalSpecies = (animalId: string) => {
    const animal = animals.find(a => a.id === animalId);
    return animal ? animal.species : 'Unknown Species';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      'PENDING': 'outline',
      'COMPLETED': 'default',
      'CANCELLED': 'destructive'
    };
    
    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${jurisdiction} Release Checklists`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    
    // Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const total = releaseChecklists.length;
    const completed = releaseChecklists.filter((c: any) => c.completed).length;
    const pending = total - completed;
    
    doc.text(`Total Checklists: ${total}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`Completed: ${completed}`, margin + 10, yPosition);
    yPosition += 7;
    doc.text(`Pending: ${pending}`, margin + 10, yPosition);
    
    yPosition += 15;
    
    // Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Release Checklists', margin, yPosition);
    
    yPosition += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    
    const headers = ['Animal', 'Species', 'Release Date', 'Location', 'Status'];
    const colWidths = [40, 35, 30, 40, 25];
    let xPos = margin;
    
    headers.forEach((header, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(header, xPos, yPosition);
      xPos += colWidths[index];
    });
    
    yPosition += 5;
    
    releaseChecklists.slice(0, 20).forEach((checklist: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      xPos = margin;
      doc.setFont('helvetica', 'normal');
      doc.text(getAnimalName(checklist.animalId), xPos, yPosition);
      xPos += colWidths[0];
      doc.text(getAnimalSpecies(checklist.animalId), xPos, yPosition);
      xPos += colWidths[1];
      doc.text(formatDate(checklist.releaseDate), xPos, yPosition);
      xPos += colWidths[2];
      doc.text(checklist.releaseLocation.substring(0, 25), xPos, yPosition);
      xPos += colWidths[3];
      doc.text(checklist.completed ? 'Completed' : 'Pending', xPos, yPosition);
      
      yPosition += 5;
    });
    
    if (releaseChecklists.length > 20) {
      yPosition += 5;
      doc.text(`... and ${releaseChecklists.length - 20} more entries`, margin, yPosition);
    }
    
    // Footer
    doc.addPage();
    yPosition = 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`This report was generated automatically by WildTrack360 Compliance System.`, margin, yPosition);
    yPosition += 7;
    doc.text('For questions or concerns, please contact your compliance coordinator.', margin, yPosition);
    
    doc.save(`${jurisdiction.toLowerCase()}-release-checklists-${new Date().toISOString().split('T')[0]}.pdf`);
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
            <h1 className="text-3xl font-bold">{jurisdiction} Release Checklists</h1>
            <p className="text-muted-foreground">
              Manage and track wildlife release procedures
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={exportToPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Link href="/compliance/release-checklist/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Checklist
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{releaseChecklists.length}</div>
            <div className="text-sm text-muted-foreground">Total Checklists</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {releaseChecklists.filter((c: any) => c.completed).length}
            </div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {releaseChecklists.filter((c: any) => !c.completed).length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {releaseChecklists.filter((c: any) => c.within10km).length}
            </div>
            <div className="text-sm text-muted-foreground">Within 10km</div>
          </CardContent>
        </Card>
      </div>

      {/* Release Checklists Table */}
      <Card>
        <CardHeader>
          <CardTitle>Release Checklists</CardTitle>
          <CardDescription>
            Track the status of all release procedures
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
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releaseChecklists.map((checklist: any) => (
                <TableRow key={checklist.id}>
                  <TableCell className="font-medium">
                    {getAnimalName(checklist.animalId)}
                  </TableCell>
                  <TableCell>{getAnimalSpecies(checklist.animalId)}</TableCell>
                  <TableCell>{formatDate(checklist.releaseDate)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {checklist.releaseLocation}
                  </TableCell>
                  <TableCell>
                    <Badge variant={checklist.within10km ? "default" : "secondary"}>
                      {checklist.within10km ? "Within 10km" : "Outside 10km"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(checklist.completed ? 'COMPLETED' : 'PENDING')}
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

      {/* Requirements Information */}
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
                  <strong>Current {jurisdiction} Policy:</strong> Releases within 10km are preferred, 
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