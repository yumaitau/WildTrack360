import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecordIcon } from './icons';
import type { Record } from '@prisma/client';
import { FileText, MapPin, AlertTriangle, User, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RecordTimelineProps {
  records: Record[];
  userMap?: { [clerkUserId: string]: string };
  rescueLocation?: { lat: number; lng: number; address: string };
  jurisdiction?: string;
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

export default function RecordTimeline({ records, userMap = {}, rescueLocation, jurisdiction }: RecordTimelineProps) {
  return (
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
                  <p className="font-semibold text-primary">{record.type}</p>
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
                  {record.description && (
                    <p className="mt-2 text-foreground">{record.description}</p>
                  )}

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
                      {jurisdiction === 'ACT' && rescueLocation && (
                        (() => {
                          const distance = calculateDistance(
                            rescueLocation.lat,
                            rescueLocation.lng,
                            record.location.lat,
                            record.location.lng
                          );
                          const isNonCompliant = distance < 10;
                          return isNonCompliant ? (
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="text-orange-800">
                                <strong>ACT Compliance Warning:</strong> Release location is {distance.toFixed(2)}km from rescue location.
                                ACT Wildlife Code requires release sites to be at least 10km from the rescue location.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                              ✓ Compliant: Release location is {distance.toFixed(2)}km from rescue location
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
  );
}
