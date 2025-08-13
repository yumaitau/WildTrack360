"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Plus, Filter, ArrowLeft } from "lucide-react";
import { getAnimals, getSpecies, getCarers } from "@/lib/data-store";
import Link from "next/link";
import { useEffect, useState } from "react";
import jsPDF from 'jspdf';

export default function WildlifeRegisterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [animals, species, carers] = await Promise.all([
          getAnimals(),
          getSpecies(),
          getCarers()
        ]);
        setData({ animals, species, carers });
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
          <div className="text-lg">Loading register data...</div>
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

  const { animals, species, carers } = data;

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
            <h1 className="text-3xl font-bold">Wildlife Admission & Outcome Register</h1>
            <p className="text-muted-foreground">
              Section 7.1.1, 7.1.2 - Maintain records of all wildlife in care
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              // Generate CSV export
              const csvContent = [
                ['Animal ID', 'Name', 'Species', 'Sex', 'Age Class', 'Rescue Location', 'Rescue Date', 'Carer', 'Status'],
                ...animals.map((animal: any) => [
                  animal.animalId,
                  animal.name,
                  animal.species,
                  animal.sex,
                  animal.ageClass,
                  animal.rescueLocation,
                  animal.rescueDate,
                  animal.carer,
                  animal.status
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `wildlife-register-${new Date().toISOString().split('T')[0]}.csv`;
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
              doc.text('Wildlife Admission & Outcome Register', pageWidth / 2, yPosition, { align: 'center' });
              
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
              
              const totalAnimals = animals.length;
              const inCare = animals.filter((a: any) => a.status === 'In Care').length;
              const released = animals.filter((a: any) => a.status === 'Released').length;
              const deceased = animals.filter((a: any) => a.status === 'Deceased').length;
              
              doc.text(`Total Animals: ${totalAnimals}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Currently in Care: ${inCare}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Successfully Released: ${released}`, margin + 10, yPosition);
              yPosition += 7;
              doc.text(`Deceased: ${deceased}`, margin + 10, yPosition);
              
              yPosition += 15;
              
              // Register table
              doc.setFontSize(14);
              doc.setFont('helvetica', 'bold');
              doc.text('Wildlife Register', margin, yPosition);
              
              yPosition += 10;
              doc.setFontSize(8);
              doc.setFont('helvetica', 'normal');
              
              // Table headers
              const headers = ['ID', 'Name', 'Species', 'Sex', 'Age', 'Location', 'Date', 'Carer', 'Status'];
              const colWidths = [25, 30, 25, 15, 20, 30, 20, 25, 20];
              let xPos = margin;
              
              headers.forEach((header, index) => {
                doc.setFont('helvetica', 'bold');
                doc.text(header, xPos, yPosition);
                xPos += colWidths[index];
              });
              
              yPosition += 5;
              
              // Table data
              animals.slice(0, 20).forEach((animal: any) => {
                if (yPosition > 250) {
                  doc.addPage();
                  yPosition = 20;
                }
                
                xPos = margin;
                doc.setFont('helvetica', 'normal');
                doc.text(animal.animalId, xPos, yPosition);
                xPos += colWidths[0];
                doc.text(animal.name, xPos, yPosition);
                xPos += colWidths[1];
                doc.text(animal.species, xPos, yPosition);
                xPos += colWidths[2];
                doc.text(animal.sex, xPos, yPosition);
                xPos += colWidths[3];
                doc.text(animal.ageClass, xPos, yPosition);
                xPos += colWidths[4];
                doc.text(animal.rescueLocation.substring(0, 20), xPos, yPosition);
                xPos += colWidths[5];
                doc.text(animal.rescueDate, xPos, yPosition);
                xPos += colWidths[6];
                doc.text(animal.carer, xPos, yPosition);
                xPos += colWidths[7];
                doc.text(animal.status, xPos, yPosition);
                
                yPosition += 5;
              });
              
              if (animals.length > 20) {
                yPosition += 5;
                doc.text(`... and ${animals.length - 20} more entries`, margin, yPosition);
              }
              
              // Footer
              doc.addPage();
              yPosition = 20;
              doc.setFontSize(10);
              doc.setFont('helvetica', 'italic');
              doc.text('This report was generated automatically by WildTrack360 Compliance System.', margin, yPosition);
              yPosition += 7;
              doc.text('For questions or concerns, please contact your compliance coordinator.', margin, yPosition);
              
              // Save the PDF
              doc.save(`wildlife-register-${new Date().toISOString().split('T')[0]}.pdf`);
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Link href="/animals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Animal
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input placeholder="Search by name, species, or ID..." />
            </div>
            <div>
              <label className="text-sm font-medium">Species</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All species</SelectItem>
                  {species.map((s: any) => (
                    <SelectItem key={s} value={s.toLowerCase()}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="in-care">In Care</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Carer</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All carers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All carers</SelectItem>
                  {carers.map((c: any) => (
                    <SelectItem key={c} value={c.toLowerCase()}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{animals.length}</div>
            <div className="text-sm text-muted-foreground">Total Animals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {animals.filter((a: any) => a.status === 'In Care').length}
            </div>
            <div className="text-sm text-muted-foreground">Currently in Care</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {animals.filter((a: any) => a.status === 'Released').length}
            </div>
            <div className="text-sm text-muted-foreground">Successfully Released</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {animals.filter((a: any) => a.status === 'Deceased').length}
            </div>
            <div className="text-sm text-muted-foreground">Deceased</div>
          </CardContent>
        </Card>
      </div>

      {/* Register Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wildlife Register</CardTitle>
          <CardDescription>
            Complete record of all wildlife admissions and outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Age Class</TableHead>
                <TableHead>Rescue Location</TableHead>
                <TableHead>Rescue Date</TableHead>
                <TableHead>Carer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {animals.map((animal: any) => (
                <TableRow key={animal.id}>
                  <TableCell className="font-mono text-sm">
                    {animal.animalId}
                  </TableCell>
                  <TableCell className="font-medium">{animal.name}</TableCell>
                  <TableCell>{animal.species}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {animal.sex}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {animal.ageClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {animal.rescueLocation}
                  </TableCell>
                  <TableCell>{animal.rescueDate}</TableCell>
                  <TableCell>{animal.carer}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        animal.status === 'In Care' ? 'default' :
                        animal.status === 'Released' ? 'secondary' :
                        animal.status === 'Deceased' ? 'destructive' : 'outline'
                      }
                    >
                      {animal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/animals/${animal.id}`}>
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

      {/* Compliance Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Required Fields (Section 7.1.1)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Animal identification number</li>
                <li>• Species and sex</li>
                <li>• Age class</li>
                <li>• Rescue location and date</li>
                <li>• Reason for admission</li>
                <li>• Carer responsible</li>
                <li>• Current status</li>
                <li>• Final outcome and date</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Record Keeping (Section 7.1.2)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maintain records for minimum 3 years</li>
                <li>• Available for inspection by authorities</li>
                <li>• Regular updates as status changes</li>
                <li>• Secure storage and backup</li>
                <li>• Export capability for reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 