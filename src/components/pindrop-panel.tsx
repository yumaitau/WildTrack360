'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Send, Loader2, CheckCircle, Clock, ExternalLink, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { getPhotoUrl } from '@/lib/photo-url';

interface PindropSession {
  id: string;
  status: 'PENDING' | 'SUBMITTED' | 'EXPIRED';
  callerName: string | null;
  callerEmail: string | null;
  callerPhone: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photoUrls: string[];
  callerNotes: string | null;
  submittedAt: string | null;
  createdAt: string;
}

interface PindropPanelProps {
  callLogId: string;
  callerPhone: string;
  onDataReceived?: (data: {
    callerName?: string;
    callerEmail?: string;
    callerPhone?: string;
    location?: string;
    coordinates?: { lat: number; lng: number };
  }) => void;
}

const MAPS_LIBRARIES: ('places')[] = ['places'];

export function PindropPanel({ callLogId, callerPhone, onDataReceived }: PindropPanelProps) {
  const [session, setSession] = useState<PindropSession | null>(null);
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(false);
  const { toast } = useToast();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  });

  const fetchSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/pindrop/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        if (data.status === 'SUBMITTED' && onDataReceived) {
          onDataReceived({
            callerName: data.callerName || undefined,
            callerEmail: data.callerEmail || undefined,
            callerPhone: data.callerPhone || undefined,
            location: data.address || undefined,
            coordinates: data.lat && data.lng ? { lat: data.lat, lng: data.lng } : undefined,
          });
        }
        return data;
      }
    } catch {
      // ignore
    }
    return null;
  }, [onDataReceived]);

  // Poll for updates when session is pending
  useEffect(() => {
    if (!session || session.status !== 'PENDING') return;
    setPolling(true);
    const interval = setInterval(async () => {
      const updated = await fetchSession(session.id);
      if (updated?.status !== 'PENDING') {
        clearInterval(interval);
        setPolling(false);
      }
    }, 5000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [session?.id, session?.status, fetchSession]);

  const handleSendSms = async () => {
    if (!callerPhone.trim()) {
      toast({ title: 'Phone Required', description: 'Enter the caller\'s phone number first.', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/pindrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerPhone, callLogId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send SMS');
      }

      const data = await res.json();
      toast({ title: 'SMS Sent', description: 'Location request sent to the caller.' });
      await fetchSession(data.id);
    } catch (error) {
      toast({
        title: 'Failed to Send',
        description: error instanceof Error ? error.message : 'Could not send SMS.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Waiting for response</Badge>;
      case 'SUBMITTED':
        return <Badge className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Submitted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // No session yet — show the send button
  if (!session) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Location Request
          </CardTitle>
          <CardDescription>
            Send the caller an SMS with a link to share their location, contact details, and photos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleSendSms}
            disabled={sending || !callerPhone.trim()}
            size="sm"
          >
            {sending ? (
              <><Loader2 className="animate-spin h-4 w-4 mr-2" /> Sending SMS...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Send Location Request SMS</>
            )}
          </Button>
          {!callerPhone.trim() && (
            <p className="text-xs text-muted-foreground mt-2">Enter a phone number above to enable this.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Session exists — show status and data
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Location Request
          </CardTitle>
          {statusBadge(session.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {session.status === 'PENDING' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {polling && <Loader2 className="animate-spin h-4 w-4" />}
            Waiting for the caller to submit their details...
          </div>
        )}

        {session.status === 'SUBMITTED' && (
          <>
            {/* Contact details from pindrop */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {session.callerName && (
                <div>
                  <span className="text-muted-foreground">Name:</span>{' '}
                  <span className="font-medium">{session.callerName}</span>
                </div>
              )}
              {session.callerEmail && (
                <div>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <span className="font-medium">{session.callerEmail}</span>
                </div>
              )}
              {session.callerPhone && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{session.callerPhone}</span>
                </div>
              )}
              {session.address && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Address:</span>{' '}
                  <span className="font-medium">{session.address}</span>
                </div>
              )}
            </div>

            {/* Map showing pin location */}
            {session.lat && session.lng && apiKey && isLoaded && (
              <div className="rounded-lg overflow-hidden border">
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '200px' }}
                  center={{ lat: session.lat, lng: session.lng }}
                  zoom={15}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: true,
                    draggable: true,
                  }}
                >
                  <Marker position={{ lat: session.lat, lng: session.lng }} />
                </GoogleMap>
              </div>
            )}

            {session.lat && session.lng && (!apiKey || !isLoaded) && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Coordinates:</span>{' '}
                {session.lat.toFixed(6)}, {session.lng.toFixed(6)}
              </div>
            )}

            {session.photoUrls.length > 0 && (
              <div>
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Photos ({session.photoUrls.length})
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {session.photoUrls.map((key, i) => {
                    const src = getPhotoUrl(key);
                    return src ? (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={src}
                          alt={`Caller photo ${i + 1}`}
                          className="w-full h-24 object-cover rounded-md border"
                        />
                      </a>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {session.callerNotes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Caller notes:</span>{' '}
                <span className="italic">{session.callerNotes}</span>
              </div>
            )}

            {session.submittedAt && (
              <div className="text-xs text-muted-foreground">
                Submitted {new Date(session.submittedAt).toLocaleString()}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Server-rendered read-only view of a pindrop session (for the call log detail page).
 */
export function PindropResultCard({ session }: { session: PindropSession }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: MAPS_LIBRARIES,
  });

  if (session.status !== 'SUBMITTED') return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Caller-Submitted Location
        </CardTitle>
        <CardDescription>
          Details shared by the caller via location request link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {session.callerName && (
            <div>
              <div className="text-sm text-muted-foreground">Name</div>
              <div className="font-medium">{session.callerName}</div>
            </div>
          )}
          {session.callerEmail && (
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium">{session.callerEmail}</div>
            </div>
          )}
          {session.callerPhone && (
            <div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="font-medium">{session.callerPhone}</div>
            </div>
          )}
          {session.address && (
            <div className="col-span-2">
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{session.address}</div>
            </div>
          )}
        </div>

        {session.lat && session.lng && apiKey && isLoaded && (
          <div className="rounded-lg overflow-hidden border">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '200px' }}
              center={{ lat: session.lat, lng: session.lng }}
              zoom={15}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                draggable: true,
              }}
            >
              <Marker position={{ lat: session.lat, lng: session.lng }} />
            </GoogleMap>
          </div>
        )}

        {session.lat && session.lng && (!apiKey || !isLoaded) && (
          <div className="rounded-md bg-muted p-3 text-sm">
            Coordinates: {session.lat.toFixed(6)}, {session.lng.toFixed(6)}
          </div>
        )}

        {session.photoUrls.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              Photos ({session.photoUrls.length})
            </div>
            <div className="grid grid-cols-3 gap-2">
              {session.photoUrls.map((key, i) => {
                const src = getPhotoUrl(key);
                return src ? (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
                    <img
                      src={src}
                      alt={`Caller photo ${i + 1}`}
                      className="w-full h-24 object-cover rounded-md border"
                    />
                  </a>
                ) : null;
              })}
            </div>
          </div>
        )}

        {session.callerNotes && (
          <div>
            <div className="text-sm text-muted-foreground">Caller Notes</div>
            <p className="text-sm italic">{session.callerNotes}</p>
          </div>
        )}

        {session.submittedAt && (
          <div className="text-xs text-muted-foreground">
            Submitted {new Date(session.submittedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
