"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from 'jspdf';

interface ExportPDFButtonProps {
  data: any;
  type: 'incidents' | 'register' | 'hygiene' | 'release-checklist';
  className?: string;
}

export function ExportPDFButton({ data, type, className }: ExportPDFButtonProps) {
  const handleExport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;
    
    // Generate PDF based on type
    switch(type) {
      case 'incidents':
        generateIncidentsPDF(doc, data, pageWidth, margin, yPosition);
        break;
      case 'register':
        generateRegisterPDF(doc, data, pageWidth, margin, yPosition);
        break;
      case 'hygiene':
        generateHygienePDF(doc, data, pageWidth, margin, yPosition);
        break;
      case 'release-checklist':
        generateReleaseChecklistPDF(doc, data, pageWidth, margin, yPosition);
        break;
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} className={className}>
      <Download className="h-4 w-4 mr-2" />
      Export PDF
    </Button>
  );
}

function generateIncidentsPDF(doc: jsPDF, data: any, pageWidth: number, margin: number, startY: number) {
  let yPosition = startY;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Incident Reports Summary', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistics', margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalIncidents = data.incidentReports?.length || 0;
  const criticalIncidents = data.incidentReports?.filter((i: any) => i.severity === 'CRITICAL').length || 0;
  const highIncidents = data.incidentReports?.filter((i: any) => i.severity === 'HIGH').length || 0;
  
  doc.text(`Total Incidents: ${totalIncidents}`, margin + 10, yPosition);
  yPosition += 7;
  doc.text(`Critical Severity: ${criticalIncidents}`, margin + 10, yPosition);
  yPosition += 7;
  doc.text(`High Severity: ${highIncidents}`, margin + 10, yPosition);
  
  yPosition += 15;
  
  // Recent Incidents
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Recent Incidents', margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  if (data.incidentReports && data.incidentReports.length > 0) {
    data.incidentReports.slice(0, 10).forEach((incident: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const date = new Date(incident.date).toLocaleDateString();
      const animalName = data.animals?.find((a: any) => a.id === incident.animalId)?.name || 'Unknown';
      
      doc.text(`• ${date} - ${incident.type} (${incident.severity}) - Animal: ${animalName}`, margin + 10, yPosition);
      yPosition += 6;
      
      if (incident.description) {
        doc.setFontSize(8);
        const lines = doc.splitTextToSize(incident.description, pageWidth - (margin * 2) - 20);
        lines.slice(0, 2).forEach((line: string) => {
          doc.text(line, margin + 15, yPosition);
          yPosition += 5;
        });
        doc.setFontSize(9);
      }
      
      yPosition += 3;
    });
  }
  
  // Save the PDF
  doc.save(`incident-reports-${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateRegisterPDF(doc: jsPDF, data: any, pageWidth: number, margin: number, startY: number) {
  let yPosition = startY;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Wildlife Compliance Register', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Statistics
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPosition);
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const totalAnimals = data.animals?.length || 0;
  const inCare = data.animals?.filter((a: any) => a.status === 'IN_CARE').length || 0;
  const released = data.animals?.filter((a: any) => a.status === 'RELEASED').length || 0;
  
  doc.text(`Total Animals: ${totalAnimals}`, margin + 10, yPosition);
  yPosition += 7;
  doc.text(`Currently In Care: ${inCare}`, margin + 10, yPosition);
  yPosition += 7;
  doc.text(`Released: ${released}`, margin + 10, yPosition);
  
  yPosition += 15;
  
  // Animal List
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Current Animals in Care', margin, yPosition);
  
  yPosition += 10;
  
  if (data.animals && data.animals.length > 0) {
    data.animals.filter((a: any) => a.status === 'IN_CARE').forEach((animal: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${animal.name} - ${animal.species}`, margin + 10, yPosition);
      yPosition += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`ID: ${animal.id}`, margin + 15, yPosition);
      yPosition += 5;
      doc.text(`Date Found: ${new Date(animal.dateFound).toLocaleDateString()}`, margin + 15, yPosition);
      yPosition += 5;
      doc.text(`Carer: ${data.carers?.find((c: any) => c.id === animal.carerId)?.name || 'Unknown'}`, margin + 15, yPosition);
      yPosition += 8;
    });
  }
  
  // Save the PDF
  doc.save(`compliance-register-${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateHygienePDF(doc: jsPDF, data: any, pageWidth: number, margin: number, startY: number) {
  let yPosition = startY;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Hygiene Records Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Records
  if (data.hygieneRecords && data.hygieneRecords.length > 0) {
    data.hygieneRecords.forEach((record: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.text(`${new Date(record.date).toLocaleDateString()} - ${record.area}`, margin + 10, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.text(`Tasks: ${record.tasksCompleted?.join(', ') || 'None'}`, margin + 15, yPosition);
      yPosition += 10;
    });
  }
  
  // Save the PDF
  doc.save(`hygiene-records-${new Date().toISOString().split('T')[0]}.pdf`);
}

function generateReleaseChecklistPDF(doc: jsPDF, data: any, pageWidth: number, margin: number, startY: number) {
  let yPosition = startY;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Release Checklist Report', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 20;
  
  // Checklists
  if (data.releaseChecklists && data.releaseChecklists.length > 0) {
    data.releaseChecklists.forEach((checklist: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      const animal = data.animals?.find((a: any) => a.id === checklist.animalId);
      doc.setFontSize(10);
      doc.text(`${animal?.name || 'Unknown'} - ${animal?.species || 'Unknown'}`, margin + 10, yPosition);
      yPosition += 6;
      doc.setFontSize(9);
      doc.text(`Release Date: ${checklist.releaseDate ? new Date(checklist.releaseDate).toLocaleDateString() : 'TBD'}`, margin + 15, yPosition);
      yPosition += 5;
      doc.text(`Status: ${checklist.completed ? 'Completed' : 'In Progress'}`, margin + 15, yPosition);
      yPosition += 10;
    });
  }
  
  // Save the PDF
  doc.save(`release-checklists-${new Date().toISOString().split('T')[0]}.pdf`);
}