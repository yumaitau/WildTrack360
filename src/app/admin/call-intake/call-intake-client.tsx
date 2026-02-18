'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Eye,
  MapPin,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface PindropSession {
  id: string;
  accessToken: string;
  status: 'PENDING' | 'SUBMITTED' | 'REVIEWED' | 'LINKED';
  callerName: string;
  callerPhone: string;
  description: string | null;
  species: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photoUrls: string[];
  callerNotes: string | null;
  submittedAt: string | null;
  linkedAnimalId: string | null;
  linkedAnimal: { id: string; name: string; species: string } | null;
  createdAt: string;
}

interface Animal {
  id: string;
  name: string;
  species: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  REVIEWED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  LINKED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export function CallIntakeClient() {
  const { organization } = useOrganization();
  const [sessions, setSessions] = useState<PindropSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form state
  const [callerName, setCallerName] = useState('');
  const [callerPhone, setCallerPhone] = useState('');
  const [description, setDescription] = useState('');
  const [species, setSpecies] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Link animal state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkingSessionId, setLinkingSessionId] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState('');
  const [animalsLoading, setAnimalsLoading] = useState(false);

  // Detail view
  const [detailSession, setDetailSession] = useState<PindropSession | null>(null);

  const orgId = organization?.id;

  const fetchSessions = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/call-intake?orgId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async () => {
    if (!callerName.trim() || !callerPhone.trim()) {
      toast.error('Caller name and phone are required');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/call-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerName: callerName.trim(),
          callerPhone: callerPhone.trim(),
          description: description.trim() || undefined,
          species: species.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to create session');
        return;
      }

      toast.success('Pindrop session created');
      setCallerName('');
      setCallerPhone('');
      setDescription('');
      setSpecies('');
      setCreateDialogOpen(false);
      fetchSessions();
    } catch {
      toast.error('Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (session: PindropSession) => {
    const url = `${window.location.origin}/pin/${session.id}?t=${session.accessToken}`;
    navigator.clipboard.writeText(url);
    setCopiedId(session.id);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copySmsMessage = (session: PindropSession) => {
    const url = `${window.location.origin}/pin/${session.id}?t=${session.accessToken}`;
    const message = `Hi ${session.callerName}, please use this link to share the location of the wildlife sighting: ${url}`;
    navigator.clipboard.writeText(message);
    toast.success('SMS message copied to clipboard');
  };

  const openLinkDialog = async (sessionId: string) => {
    setLinkingSessionId(sessionId);
    setSelectedAnimalId('');
    setLinkDialogOpen(true);
    setAnimalsLoading(true);
    try {
      const res = await fetch(`/api/animals${orgId ? `?orgId=${orgId}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setAnimals(data);
      }
    } catch {
      toast.error('Failed to load animals');
    } finally {
      setAnimalsLoading(false);
    }
  };

  const handleLinkAnimal = async () => {
    if (!linkingSessionId || !selectedAnimalId) return;

    try {
      const res = await fetch(`/api/call-intake/${linkingSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkedAnimalId: selectedAnimalId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to link animal');
        return;
      }

      toast.success('Animal linked successfully');
      setLinkDialogOpen(false);
      fetchSessions();
    } catch {
      toast.error('Failed to link animal');
    }
  };

  const markReviewed = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/call-intake/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVIEWED' }),
      });

      if (res.ok) {
        toast.success('Marked as reviewed');
        fetchSessions();
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Intake</h1>
          <p className="text-muted-foreground">
            Create pindrop sessions for callers to share wildlife locations
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Pindrop Session</DialogTitle>
              <DialogDescription>
                Create a session and send the link to the caller via SMS.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="callerName">Caller Name *</Label>
                <Input
                  id="callerName"
                  value={callerName}
                  onChange={(e) => setCallerName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="callerPhone">Caller Phone *</Label>
                <Input
                  id="callerPhone"
                  value={callerPhone}
                  onChange={(e) => setCallerPhone(e.target.value)}
                  placeholder="0412 345 678"
                />
              </div>
              <div>
                <Label htmlFor="species">Species (if known)</Label>
                <Input
                  id="species"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  placeholder="e.g. Eastern Grey Kangaroo"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief notes about the call..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Create Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pindrop sessions yet.</p>
            <p className="text-sm">
              Create one when you receive a wildlife call.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {session.callerName}
                      {session.species && (
                        <span className="font-normal text-muted-foreground ml-2">
                          — {session.species}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {session.callerPhone} &middot;{' '}
                      {formatDate(session.createdAt)}
                    </CardDescription>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[session.status]}`}
                  >
                    {session.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {session.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {session.description}
                  </p>
                )}

                {session.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(session)}
                    >
                      {copiedId === session.id ? (
                        <Check className="h-4 w-4 mr-1" />
                      ) : (
                        <Copy className="h-4 w-4 mr-1" />
                      )}
                      Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copySmsMessage(session)}
                    >
                      <Phone className="h-4 w-4 mr-1" />
                      Copy SMS
                    </Button>
                  </div>
                )}

                {session.status === 'SUBMITTED' && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                      {session.address && (
                        <p>
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {session.address}
                        </p>
                      )}
                      {session.lat && session.lng && (
                        <p className="text-xs text-muted-foreground">
                          {session.lat.toFixed(6)}, {session.lng.toFixed(6)}
                        </p>
                      )}
                      {session.callerNotes && (
                        <p className="italic">{session.callerNotes}</p>
                      )}
                      {session.photoUrls.length > 0 && (
                        <p className="text-xs">
                          {session.photoUrls.length} photo(s) uploaded
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetailSession(session)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markReviewed(session.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark Reviewed
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openLinkDialog(session.id)}
                      >
                        <Link2 className="h-4 w-4 mr-1" />
                        Link Animal
                      </Button>
                    </div>
                  </div>
                )}

                {session.status === 'REVIEWED' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailSession(session)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openLinkDialog(session.id)}
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      Link Animal
                    </Button>
                  </div>
                )}

                {session.status === 'LINKED' && session.linkedAnimal && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Linked to:
                    </span>
                    <span className="text-sm font-medium">
                      {session.linkedAnimal.name} ({session.linkedAnimal.species})
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetailSession(session)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Animal Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Animal Record</DialogTitle>
            <DialogDescription>
              Select an existing animal record to link this pindrop session to.
            </DialogDescription>
          </DialogHeader>
          {animalsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin h-6 w-6" />
            </div>
          ) : (
            <div>
              <Label>Animal</Label>
              <Select
                value={selectedAnimalId}
                onValueChange={setSelectedAnimalId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an animal..." />
                </SelectTrigger>
                <SelectContent>
                  {animals.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animal.name} — {animal.species} ({animal.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAnimal}
              disabled={!selectedAnimalId}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Link Animal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={!!detailSession}
        onOpenChange={(open) => !open && setDetailSession(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pindrop Details</DialogTitle>
          </DialogHeader>
          {detailSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Caller:</span>
                  <p className="font-medium">{detailSession.callerName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{detailSession.callerPhone}</p>
                </div>
                {detailSession.species && (
                  <div>
                    <span className="text-muted-foreground">Species:</span>
                    <p className="font-medium">{detailSession.species}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[detailSession.status]}`}
                    >
                      {detailSession.status}
                    </span>
                  </p>
                </div>
              </div>

              {detailSession.address && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <p>{detailSession.address}</p>
                </div>
              )}

              {detailSession.lat && detailSession.lng && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Coordinates:</span>
                  <p>
                    {detailSession.lat.toFixed(6)},{' '}
                    {detailSession.lng.toFixed(6)}
                    <a
                      href={`https://www.google.com/maps?q=${detailSession.lat},${detailSession.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 mr-0.5" />
                      Google Maps
                    </a>
                  </p>
                </div>
              )}

              {detailSession.callerNotes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Caller Notes:</span>
                  <p className="italic">{detailSession.callerNotes}</p>
                </div>
              )}

              {detailSession.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Admin Description:</span>
                  <p>{detailSession.description}</p>
                </div>
              )}

              {detailSession.photoUrls.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Photos:</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {detailSession.photoUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={url}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-24 object-cover rounded-md hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detailSession.linkedAnimal && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Linked Animal:</span>
                  <p className="font-medium">
                    {detailSession.linkedAnimal.name} (
                    {detailSession.linkedAnimal.species})
                  </p>
                </div>
              )}

              {detailSession.submittedAt && (
                <p className="text-xs text-muted-foreground">
                  Submitted: {formatDate(detailSession.submittedAt)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
