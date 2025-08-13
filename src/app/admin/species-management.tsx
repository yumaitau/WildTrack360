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
  const [speciesToDelete, setSpeciesToDelete] = useState<string | null>(null);
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
      await apiJson(`/api/species`, { 
        method: 'PATCH', 
        body: JSON.stringify({ 
          oldName: editingSpecies.name, 
          newName: editName.trim(), 
          scientificName: editScientificName || null,
          description: editDescription || null,
          careRequirements: editCareRequirements || null,
          orgId: organization?.id 
        }) 
      });
      setEditingSpecies(null);
      setEditName('');
      setEditScientificName('');
      setEditDescription('');
      setEditCareRequirements('');
      setIsEditDialogOpen(false);
      await refreshSpecies();
      toast({ title: 'Success', description: `Species updated.` });
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
      await apiJson(`/api/species`, { method: 'DELETE', body: JSON.stringify({ name: speciesToDelete, orgId: organization?.id }) });
      setSpeciesToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshSpecies();
      toast({ title: 'Success', description: `Species "${speciesToDelete}" deleted.` });
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

  const openDeleteDialog = (speciesName: string) => {
    setSpeciesToDelete(speciesName);
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
              <TableHead>Species Name</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {species.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
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
                    onClick={() => openDeleteDialog(s.name)}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {species.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No species found. Add your first species above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Species Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Species</DialogTitle>
            <DialogDescription>
              Provide details for the new species.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <Input
              placeholder="Scientific Name (optional)"
              value={addScientificName}
              onChange={(e) => setAddScientificName(e.target.value)}
            />
            <Input
              placeholder="Description (optional)"
              value={addDescription}
              onChange={(e) => setAddDescription(e.target.value)}
            />
            <Input
              placeholder="Care Requirements (optional)"
              value={addCareRequirements}
              onChange={(e) => setAddCareRequirements(e.target.value)}
            />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Species</DialogTitle>
            <DialogDescription>Update species details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input placeholder="Scientific Name (optional)" value={editScientificName} onChange={(e) => setEditScientificName(e.target.value)} />
            <Input placeholder="Description (optional)" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            <Input placeholder="Care Requirements (optional)" value={editCareRequirements} onChange={(e) => setEditCareRequirements(e.target.value)} />
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
              Are you sure you want to delete "{speciesToDelete}"? This action cannot be undone.
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
