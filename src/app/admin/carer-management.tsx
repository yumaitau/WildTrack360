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

interface CarerManagementProps {
  initialCarers: string[];
}

export function CarerManagement({ initialCarers }: CarerManagementProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [carers, setCarers] = useState<string[]>(initialCarers);
  const [newCarer, setNewCarer] = useState('');
  const [editingCarer, setEditingCarer] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [carerToDelete, setCarerToDelete] = useState<string | null>(null);
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
  const [addActive, setAddActive] = useState(true);

  // Refresh carers list from data store
  const refreshCarers = async () => {
    try {
      const orgId = organization?.id || 'default-org';
      const updatedCarers = await apiJson<any[]>(`/api/carers?orgId=${orgId}`);
      setCarers(updatedCarers.map(c => c.name));
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

  const handleEditCarer = async () => {
    if (!editingCarer || !editValue.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Carer name cannot be empty.' });
      return;
    }
    setLoading(true);
    try {
      await apiJson(`/api/carers`, { method: 'PATCH', body: JSON.stringify({ oldName: editingCarer, newName: editValue.trim(), orgId: organization?.id }) });
      setEditingCarer(null);
      setEditValue('');
      setIsEditDialogOpen(false);
      await refreshCarers();
      toast({ title: 'Success', description: `Carer "${editingCarer}" updated to "${editValue.trim()}".` });
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
      await apiJson(`/api/carers`, { method: 'DELETE', body: JSON.stringify({ name: carerToDelete, orgId: organization?.id }) });
      setCarerToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshCarers();
      toast({ title: 'Success', description: `Carer "${carerToDelete}" deleted.` });
    } catch (error) {
      console.error('Error deleting carer:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete carer.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (carerName: string) => {
    setEditingCarer(carerName);
    setEditValue(carerName);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (carerName: string) => {
    setCarerToDelete(carerName);
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
              <TableHead>Carer Name</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carers.map((c) => (
              <TableRow key={c}>
                <TableCell>{c}</TableCell>
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
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No carers found. Add your first carer above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Carer</DialogTitle>
            <DialogDescription>
              Update the carer name. This will also update all animals assigned to this carer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Carer name..."
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEditCarer()}
            />
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
              disabled={loading || !editValue.trim() || editValue === editingCarer}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Carer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Carer</DialogTitle>
            <DialogDescription>
              Provide details for the new carer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={addName} onChange={(e) => setAddName(e.target.value)} />
            <Input placeholder="Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            <Input placeholder="Phone (optional)" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} />
            <Input placeholder="License Number (optional)" value={addLicenseNumber} onChange={(e) => setAddLicenseNumber(e.target.value)} />
            <Input placeholder="Jurisdiction (optional)" value={addJurisdiction} onChange={(e) => setAddJurisdiction(e.target.value)} />
            <div className="space-y-2">
              <Label>Specialties (comma-separated)</Label>
              <Textarea placeholder="e.g. Raptors, Marsupials" value={addSpecialtiesText} onChange={(e) => setAddSpecialtiesText(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch checked={addActive} onCheckedChange={setAddActive} id="carer-active" />
              <Label htmlFor="carer-active">Active</Label>
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
              Are you sure you want to delete "{carerToDelete}"? This action cannot be undone.
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
