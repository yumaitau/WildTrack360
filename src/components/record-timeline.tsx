"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { getRecordIcon } from './icons';
import type { Record } from '@prisma/client';
import { FileText, MapPin, AlertTriangle, User, Clock, Phone, Trash2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getJurisdictionComplianceConfig } from '@/lib/compliance-rules';

const CALL_LOG_ID_PATTERN = /^\[CallLog:([^\]]+)\]\s*/;
const CALL_LOG_LEGACY_PATTERN = /^Call Log:\s*/;

interface RecordTimelineProps {
  records: Record[];
  userMap?: { [clerkUserId: string]: string };
  rescueLocation?: { lat: number; lng: number; address: string };
  jurisdiction?: string;
  onDeleteRecord?: (recordId: string) => Promise<void>;
}

const isCoordObj = (loc: any): loc is { lat: number; lng: number; address?: string } =>
  loc && typeof loc === 'object' && 'lat' in loc && 'lng' in loc;

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export default function RecordTimeline({ records, userMap = {}, rescueLocation, jurisdiction, onDeleteRecord }: RecordTimelineProps) {
  const distanceReq = useMemo(() => {
    if (!jurisdiction) return null;
    const config = getJurisdictionComplianceConfig(jurisdiction);
    return config.distanceRequirements;
  }, [jurisdiction]);

  const [recordToDelete, setRecordToDelete] = useState<Record | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!recordToDelete || !onDeleteRecord) return;
    setIsDeleting(true);
    try {
      await onDeleteRecord(recordToDelete.id);
      setRecordToDelete(null);
    } catch (error) {
      console.error('Error deleting record:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Record History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length > 0 ? (
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 h-full w-0.5 bg-border rounded"></div>
            {records.map((record) => (
              <div key={record.id} className="relative mb-8">
                <div className="absolute -left-[31px] top-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-primary">
                   <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {getRecordIcon(record.type, { className: 'h-5 w-5' })}
                   </div>
                </div>
                <div className="ml-8">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-primary">{record.type}</p>
                    {onDeleteRecord && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete record"
                        onClick={() => setRecordToDelete(record)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <time className="text-sm text-muted-foreground">
                    {record.date ? new Date(record.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : new Date(record.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </time>

                  {/* Recorded by */}
                  {record.clerkUserId && userMap[record.clerkUserId] && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Recorded by <span className="font-medium text-foreground">{userMap[record.clerkUserId]}</span></span>
                    </div>
                  )}

                  {/* Description */}
                  {record.description && (() => {
                    const callLogIdMatch = record.description.match(CALL_LOG_ID_PATTERN);
                    if (callLogIdMatch) {
                      const callLogId = callLogIdMatch[1];
                      const displayText = record.description.replace(CALL_LOG_ID_PATTERN, '');
                      return (
                        <div className="mt-2">
                          <p className="text-foreground">{displayText}</p>
                          <Link href={`/compliance/call-logs/${callLogId}`}>
                            <Button variant="outline" size="sm" className="mt-2">
                              <Phone className="h-3.5 w-3.5 mr-1.5" />
                              View Call Log
                            </Button>
                          </Link>
                        </div>
                      );
                    }
                    if (CALL_LOG_LEGACY_PATTERN.test(record.description)) {
                      const displayText = record.description.replace(CALL_LOG_LEGACY_PATTERN, '');
                      return (
                        <div className="mt-2">
                          <p className="text-foreground">{displayText}</p>
                          <Link href="/compliance/call-logs">
                            <Button variant="outline" size="sm" className="mt-2">
                              <Phone className="h-3.5 w-3.5 mr-1.5" />
                              View Call Logs
                            </Button>
                          </Link>
                        </div>
                      );
                    }
                    return <p className="mt-2 text-foreground">{record.description}</p>;
                  })()}

                  {/* Notes */}
                  {record.notes && (
                    <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                      <span className="font-medium">Notes:</span> {record.notes}
                    </div>
                  )}

                  {/* Location (non-coordinate string) */}
                  {record.location && !isCoordObj(record.location) && (
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{record.location as string}</span>
                    </div>
                  )}

                  {/* Created / Updated timestamps */}
                  {record.createdAt && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Created {new Date(record.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {record.updatedAt && new Date(record.updatedAt).getTime() - new Date(record.createdAt).getTime() > 1000 && (
                        <span className="ml-1">&middot; Updated {new Date(record.updatedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  )}

                  {/* Coordinate location (release records) */}
                  {record.location && isCoordObj(record.location) && (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm bg-green-50 border border-green-200 p-2 rounded-md">
                        <div className="flex items-center gap-2 text-green-700">
                          <MapPin className="h-4 w-4" />
                          <span className="font-semibold">Release Location:</span>
                        </div>
                        {record.location.address && (
                          <p className="text-green-600 mt-1">{record.location.address}</p>
                        )}
                        <p className="text-xs text-green-500 mt-1">
                          Coordinates: {record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}
                        </p>
                      </div>
                      {distanceReq?.enforced && rescueLocation && (
                        (() => {
                          const distance = calculateDistance(
                            rescueLocation.lat,
                            rescueLocation.lng,
                            record.location.lat,
                            record.location.lng
                          );
                          const isNonCompliant = distance < distanceReq.releaseDistance;
                          return isNonCompliant ? (
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800">
                                <strong>{jurisdiction} Compliance Warning:</strong> Release location is {distance.toFixed(2)}{distanceReq.unit} from rescue location.
                                Release sites must be at least {distanceReq.releaseDistance}{distanceReq.unit} from the rescue location.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                              ✓ Compliant: Release location is {distance.toFixed(2)}{distanceReq.unit} from rescue location
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        ) : (
             <div className="text-center py-8 text-muted-foreground">
                <p>No records found for this animal.</p>
            </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!recordToDelete} onOpenChange={(open) => { if (!open) setRecordToDelete(null); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Record
          </DialogTitle>
          <DialogDescription className="pt-3" asChild>
            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                Are you sure you want to delete this {recordToDelete?.type} record?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  Warning: This action cannot be reversed.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  WildTrack360 is designed as an immutable ledger. Deleting a record permanently
                  removes it and may affect your compliance and activity reporting. Only remove
                  records that were created in error or for testing.
                </p>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setRecordToDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>Delete Record</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
