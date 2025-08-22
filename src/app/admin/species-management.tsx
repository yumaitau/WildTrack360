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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pen, PlusCircle, Trash, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface SpeciesItem { id: string; name: string; scientificName?: string | null; description?: string | null; careRequirements?: string | null }
interface SpeciesManagementProps { initialSpecies: string[] }

export function SpeciesManagement({ initialSpecies }: SpeciesManagementProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [newSpecies, setNewSpecies] = useState('');
  const [editingSpecies, setEditingSpecies] = useState<SpeciesItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editScientificName, setEditScientificName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCareRequirements, setEditCareRequirements] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [speciesToDelete, setSpeciesToDelete] = useState<SpeciesItem | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addScientificName, setAddScientificName] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCareRequirements, setAddCareRequirements] = useState('');

  const refreshSpecies = async () => {
    try {
      const orgId = organization?.id || 'default-org';
      const updatedSpecies = await apiJson<SpeciesItem[]>(`/api/species?orgId=${orgId}`);
      setSpecies(updatedSpecies);
    } catch (error) {
      console.error('Error refreshing species:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to refresh species list.' 
      });
    }
  };

  useEffect(() => {
    refreshSpecies();
  }, [organization]);

  const openAddDialog = () => {
    setAddName(newSpecies.trim());
    setAddScientificName('');
    setAddDescription('');
    setAddCareRequirements('');
    setIsAddDialogOpen(true);
  };

  const handleAddSpecies = async () => {
    if (!addName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Species name cannot be empty.' });
      return;
    }
    setLoading(true);
    try {
      await apiJson(`/api/species`, { 
        method: 'POST', 
        body: JSON.stringify({ 
          name: addName.trim(),
          scientificName: addScientificName || null,
          description: addDescription || null,
          careRequirements: addCareRequirements || null,
          clerkOrganizationId: organization?.id 
        }) 
      });
      setNewSpecies('');
      setIsAddDialogOpen(false);
      setAddName('');
      setAddScientificName('');
      setAddDescription('');
      setAddCareRequirements('');
      await refreshSpecies();
      toast({ title: 'Success', description: `Species "${addName.trim()}" added.` });
    } catch (error) {
      console.error('Error adding species:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to add species.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSpecies = async () => {
    if (!editingSpecies || !editName.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Species name cannot be empty.' });
      return;
    }
    setLoading(true);
    try {
      await apiJson(`/api/species/${editingSpecies.id}`, { 
        method: 'PATCH', 
        body: JSON.stringify({ 
          name: editName.trim(), 
          scientificName: editScientificName || null,
          description: editDescription || null,
          careRequirements: editCareRequirements || null
        }) 
      });
      setEditingSpecies(null);
      setEditName('');
      setEditScientificName('');
      setEditDescription('');
      setEditCareRequirements('');
      setIsEditDialogOpen(false);
      await refreshSpecies();
      toast({ title: 'Success', description: `Species "${editName.trim()}" updated.` });
    } catch (error) {
      console.error('Error updating species:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to update species.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecies = async () => {
    if (!speciesToDelete) return;
    setLoading(true);
    try {
      await apiJson(`/api/species/${speciesToDelete.id}`, { method: 'DELETE' });
      setSpeciesToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshSpecies();
      toast({ title: 'Success', description: `Species "${speciesToDelete.name}" deleted.` });
    } catch (error) {
      console.error('Error deleting species:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to delete species.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (item: SpeciesItem) => {
    setEditingSpecies(item);
    setEditName(item.name);
    setEditScientificName(item.scientificName || '');
    setEditDescription(item.description || '');
    setEditCareRequirements(item.careRequirements || '');
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (species: SpeciesItem) => {
    setSpeciesToDelete(species);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New species name..."
          value={newSpecies}
          onChange={(e) => setNewSpecies(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && openAddDialog()}
          disabled={loading}
        />
        <Button onClick={openAddDialog} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Add Species
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Common Name</TableHead>
              <TableHead>Scientific Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Care Requirements</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {species.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>
                  {s.scientificName ? (
                    <span className="italic text-muted-foreground">{s.scientificName}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {s.description || '-'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {s.careRequirements || '-'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(s)}
                    disabled={loading}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(s)}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {species.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No species found. Add your first species above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Species Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Species</DialogTitle>
            <DialogDescription>
              Provide details for the new species.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Common Name *</Label>
              <Input
                id="add-name"
                placeholder="e.g., Eastern Grey Kangaroo"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-scientific">Scientific Name</Label>
              <Input
                id="add-scientific"
                placeholder="e.g., Macropus giganteus"
                value={addScientificName}
                onChange={(e) => setAddScientificName(e.target.value)}
                className="italic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-description">Description</Label>
              <Textarea
                id="add-description"
                placeholder="General description of the species..."
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-care">Care Requirements</Label>
              <Textarea
                id="add-care"
                placeholder="Specific care requirements, dietary needs, habitat requirements..."
                value={addCareRequirements}
                onChange={(e) => setAddCareRequirements(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddSpecies} disabled={loading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Save Species
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog (full fields) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Species</DialogTitle>
            <DialogDescription>Update species details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Common Name *</Label>
              <Input 
                id="edit-name"
                placeholder="e.g., Eastern Grey Kangaroo" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-scientific">Scientific Name</Label>
              <Input 
                id="edit-scientific"
                placeholder="e.g., Macropus giganteus" 
                value={editScientificName} 
                onChange={(e) => setEditScientificName(e.target.value)}
                className="italic" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description"
                placeholder="General description of the species..." 
                value={editDescription} 
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-care">Care Requirements</Label>
              <Textarea 
                id="edit-care"
                placeholder="Specific care requirements, dietary needs, habitat requirements..." 
                value={editCareRequirements} 
                onChange={(e) => setEditCareRequirements(e.target.value)}
                rows={4} 
              />
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
              onClick={handleEditSpecies} 
              disabled={loading || !editName.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Species</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{speciesToDelete?.name}"? This action cannot be undone.
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
              onClick={handleDeleteSpecies} 
              disabled={loading}
            >
              <Trash className="mr-2 h-4 w-4" />
              {loading ? 'Deleting...' : 'Delete Species'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
