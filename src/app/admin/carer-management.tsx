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
import { Pen, PlusCircle, Trash, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface Carer {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  licenseNumber?: string | null;
  jurisdiction?: string | null;
  specialties?: string[];
  notes?: string | null;
  active: boolean;
}

interface CarerManagementProps {
  initialCarers: string[];
}

export function CarerManagement({ initialCarers }: CarerManagementProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [carers, setCarers] = useState<Carer[]>([]);
  const [newCarer, setNewCarer] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [carerToDelete, setCarerToDelete] = useState<Carer | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLicenseNumber, setAddLicenseNumber] = useState('');
  const [addJurisdiction, setAddJurisdiction] = useState('');
  const [addSpecialtiesText, setAddSpecialtiesText] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addActive, setAddActive] = useState(true);

  // Edit dialog state
  const [editingCarer, setEditingCarer] = useState<Carer | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editSpecialtiesText, setEditSpecialtiesText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Refresh carers list from data store
  const refreshCarers = async () => {
    try {
      const orgId = organization?.id || 'default-org';
      const updatedCarers = await apiJson<Carer[]>(`/api/carers?orgId=${orgId}`);
      setCarers(updatedCarers);
    } catch (error) {
      console.error('Error refreshing carers:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh carers list.' });
    }
  };

  useEffect(() => {
    refreshCarers();
  }, [organization]);

  const openAddDialog = () => {
    setAddName(newCarer.trim());
    setAddEmail('');
    setAddPhone('');
    setAddLicenseNumber('');
    setAddJurisdiction('');
    setAddSpecialtiesText('');
    setAddNotes('');
    setAddActive(true);
    setIsAddDialogOpen(true);
  };

  const handleCreateCarer = async () => {
    if (!addName.trim() || !addEmail.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and email are required.' });
      return;
    }
    setLoading(true);
    try {
      const specialties = addSpecialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await apiJson(`/api/carers`, { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: addName.trim(),
          email: addEmail.trim(),
          phone: addPhone || null,
          licenseNumber: addLicenseNumber || null,
          jurisdiction: addJurisdiction || null,
          specialties,
          notes: addNotes || null,
          active: addActive,
          clerkOrganizationId: organization?.id
        }) 
      });
      setNewCarer('');
      setIsAddDialogOpen(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setAddLicenseNumber('');
      setAddJurisdiction('');
      setAddSpecialtiesText('');
      setAddNotes('');
      setAddActive(true);
      await refreshCarers();
      toast({ title: 'Success', description: `Carer "${addName.trim()}" added.` });
    } catch (error) {
      console.error('Error adding carer:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to add carer.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = async (carer: Carer) => {
    setEditingCarer(carer);
    setEditName(carer.name);
    setEditEmail(carer.email);
    setEditPhone(carer.phone || '');
    setEditLicenseNumber(carer.licenseNumber || '');
    setEditJurisdiction(carer.jurisdiction || '');
    setEditSpecialtiesText((carer.specialties || []).join(', '));
    setEditNotes(carer.notes || '');
    setEditActive(carer.active);
    setIsEditDialogOpen(true);
  };

  const handleEditCarer = async () => {
    if (!editingCarer || !editName.trim() || !editEmail.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Name and email are required.' });
      return;
    }
    setLoading(true);
    try {
      const specialties = editSpecialtiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      
      await apiJson(`/api/carers/${editingCarer.id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ 
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone || null,
          licenseNumber: editLicenseNumber || null,
          jurisdiction: editJurisdiction || null,
          specialties,
          notes: editNotes || null,
          active: editActive
        }) 
      });
      
      setEditingCarer(null);
      setIsEditDialogOpen(false);
      await refreshCarers();
      toast({ title: 'Success', description: `Carer "${editName.trim()}" updated.` });
    } catch (error) {
      console.error('Error updating carer:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to update carer.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCarer = async () => {
    if (!carerToDelete) return;
    setLoading(true);
    try {
      await apiJson(`/api/carers/${carerToDelete.id}`, { method: 'DELETE' });
      setCarerToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshCarers();
      toast({ title: 'Success', description: `Carer "${carerToDelete.name}" deleted.` });
    } catch (error) {
      console.error('Error deleting carer:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete carer.' });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (carer: Carer) => {
    setCarerToDelete(carer);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New carer name..."
          value={newCarer}
          onChange={(e) => setNewCarer(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && openAddDialog()}
          disabled={loading}
        />
        <Button onClick={openAddDialog} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Add Carer
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>License Number</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(c)}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {carers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No carers found. Add your first carer above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Carer</DialogTitle>
            <DialogDescription>
              Update the carer details. Changes will affect all animals assigned to this carer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input 
                  id="edit-name"
                  placeholder="Name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email *</Label>
                <Input 
                  id="edit-email"
                  placeholder="Email" 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)} 
                />
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
              disabled={loading || !editName.trim() || !editEmail.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Carer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Carer</DialogTitle>
            <DialogDescription>
              Provide details for the new carer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-name">Name *</Label>
                <Input 
                  id="add-name"
                  placeholder="Name" 
                  value={addName} 
                  onChange={(e) => setAddName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-email">Email *</Label>
                <Input 
                  id="add-email"
                  placeholder="Email" 
                  type="email" 
                  value={addEmail} 
                  onChange={(e) => setAddEmail(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input 
                  id="add-phone"
                  placeholder="Phone (optional)" 
                  value={addPhone} 
                  onChange={(e) => setAddPhone(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-license">License Number</Label>
                <Input 
                  id="add-license"
                  placeholder="License Number (optional)" 
                  value={addLicenseNumber} 
                  onChange={(e) => setAddLicenseNumber(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-jurisdiction">Jurisdiction</Label>
              <Input 
                id="add-jurisdiction"
                placeholder="Jurisdiction (optional)" 
                value={addJurisdiction} 
                onChange={(e) => setAddJurisdiction(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-specialties">Specialties (comma-separated)</Label>
              <Textarea 
                id="add-specialties"
                placeholder="e.g. Raptors, Marsupials" 
                value={addSpecialtiesText} 
                onChange={(e) => setAddSpecialtiesText(e.target.value)} 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Textarea 
                id="add-notes"
                placeholder="Additional notes (optional)" 
                value={addNotes} 
                onChange={(e) => setAddNotes(e.target.value)} 
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                checked={addActive} 
                onCheckedChange={setAddActive} 
                id="add-carer-active" 
              />
              <Label htmlFor="add-carer-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleCreateCarer} disabled={loading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Save Carer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Carer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{carerToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteCarer} 
              disabled={loading}
            >
              <Trash className="mr-2 h-4 w-4" />
              {loading ? 'Deleting...' : 'Delete Carer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}