"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pen, Save, X, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@clerk/nextjs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { EnrichedCarer } from '@/lib/types';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function CarerManagement() {
  const { organization } = useOrganization();
  const [carers, setCarers] = useState<EnrichedCarer[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Edit dialog state
  const [editingCarer, setEditingCarer] = useState<EnrichedCarer | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editSpecialtiesText, setEditSpecialtiesText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editStreetAddress, setEditStreetAddress] = useState('');
  const [editSuburb, setEditSuburb] = useState('');
  const [editState, setEditState] = useState('NSW');
  const [editPostcode, setEditPostcode] = useState('');

  const refreshCarers = async () => {
    const orgId = organization?.id;
    if (!orgId) return;
    try {
      const updatedCarers = await apiJson<EnrichedCarer[]>(`/api/carers?orgId=${orgId}`);
      setCarers(updatedCarers);
    } catch (error) {
      console.error('Error refreshing carers:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh carers list.' });
    }
  };

  useEffect(() => {
    refreshCarers();
  }, [organization]);

  const openEditDialog = (carer: EnrichedCarer) => {
    setEditingCarer(carer);
    setEditPhone(carer.phone || '');
    setEditLicenseNumber(carer.licenseNumber || '');
    setEditJurisdiction(carer.jurisdiction || '');
    setEditSpecialtiesText((carer.specialties || []).join(', '));
    setEditNotes(carer.notes || '');
    setEditActive(carer.active);
    setEditStreetAddress(carer.streetAddress || '');
    setEditSuburb(carer.suburb || '');
    setEditState(carer.state || 'NSW');
    setEditPostcode(carer.postcode || '');
    setIsEditDialogOpen(true);
  };

  const handleEditCarer = async () => {
    if (!editingCarer) return;
    setLoading(true);
    try {
      const specialties = editSpecialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await apiJson(`/api/carers/${editingCarer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          phone: editPhone || null,
          licenseNumber: editLicenseNumber || null,
          jurisdiction: editJurisdiction || null,
          specialties,
          notes: editNotes || null,
          active: editActive,
          streetAddress: editStreetAddress || null,
          suburb: editSuburb || null,
          state: editState || null,
          postcode: editPostcode || null,
        })
      });

      setEditingCarer(null);
      setIsEditDialogOpen(false);
      await refreshCarers();
      toast({ title: 'Success', description: `Profile for "${editingCarer.name}" updated.` });
    } catch (error) {
      console.error('Error updating carer profile:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>To add or remove people, use the <strong>Manage Users</strong> tab. This page manages domain-specific profile data for existing org members.</span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>License Number</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.phone || '-'}</TableCell>
                <TableCell>{c.licenseNumber || '-'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    c.hasProfile ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {c.hasProfile ? 'Complete' : 'Incomplete'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(c)}
                    disabled={loading}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {carers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No organization members found. Invite users via the Manage Users tab.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Carer Profile</DialogTitle>
            <DialogDescription>
              Update profile details for {editingCarer?.name}. Name and email are managed via Clerk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Read-only identity info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editingCarer?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingCarer?.email || ''} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="Phone (optional)"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input
                  id="edit-license"
                  placeholder="License Number (optional)"
                  value={editLicenseNumber}
                  onChange={(e) => setEditLicenseNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-jurisdiction">Jurisdiction</Label>
              <Input
                id="edit-jurisdiction"
                placeholder="Jurisdiction (optional)"
                value={editJurisdiction}
                onChange={(e) => setEditJurisdiction(e.target.value)}
              />
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Address Details (Required for NSW Reporting)</h4>
              <div className="space-y-2">
                <Label htmlFor="edit-street">Street Address</Label>
                <Input
                  id="edit-street"
                  placeholder="e.g., 123 Main Street"
                  value={editStreetAddress}
                  onChange={(e) => setEditStreetAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-suburb">Suburb/Town</Label>
                  <Input
                    id="edit-suburb"
                    placeholder="e.g., Sydney"
                    value={editSuburb}
                    onChange={(e) => setEditSuburb(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-postcode">Postcode</Label>
                  <Input
                    id="edit-postcode"
                    placeholder="e.g., 2000"
                    value={editPostcode}
                    onChange={(e) => setEditPostcode(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-specialties">Specialties (comma-separated)</Label>
              <Textarea
                id="edit-specialties"
                placeholder="e.g. Raptors, Marsupials"
                value={editSpecialtiesText}
                onChange={(e) => setEditSpecialtiesText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes (optional)"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={editActive}
                onCheckedChange={setEditActive}
                id="edit-carer-active"
              />
              <Label htmlFor="edit-carer-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleEditCarer}
              disabled={loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
