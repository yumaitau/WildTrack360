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
import { getSpecies, createSpecies, updateSpecies, deleteSpecies } from '@/lib/data-store';

interface SpeciesManagementProps {
  initialSpecies: string[];
}

export function SpeciesManagement({ initialSpecies }: SpeciesManagementProps) {
  const [species, setSpecies] = useState<string[]>(initialSpecies);
  const [newSpecies, setNewSpecies] = useState('');
  const [editingSpecies, setEditingSpecies] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [speciesToDelete, setSpeciesToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Refresh species list from data store
  const refreshSpecies = async () => {
    try {
      const updatedSpecies = await getSpecies();
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
  }, []);

  const handleAddSpecies = async () => {
    if (!newSpecies.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Species name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      await createSpecies(newSpecies.trim());
      setNewSpecies('');
      await refreshSpecies();
      toast({ 
        title: 'Success', 
        description: `Species "${newSpecies.trim()}" added.` 
      });
    } catch (error) {
      console.error('Error adding species:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add species.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSpecies = async () => {
    if (!editingSpecies || !editValue.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Species name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      await updateSpecies(editingSpecies, editValue.trim());
      setEditingSpecies(null);
      setEditValue('');
      setIsEditDialogOpen(false);
      await refreshSpecies();
      toast({ 
        title: 'Success', 
        description: `Species "${editingSpecies}" updated to "${editValue.trim()}".` 
      });
    } catch (error) {
      console.error('Error updating species:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update species.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSpecies = async () => {
    if (!speciesToDelete) return;

    setLoading(true);
    try {
      await deleteSpecies(speciesToDelete);
      setSpeciesToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshSpecies();
      toast({ 
        title: 'Success', 
        description: `Species "${speciesToDelete}" deleted.` 
      });
    } catch (error) {
      console.error('Error deleting species:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete species.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (speciesName: string) => {
    setEditingSpecies(speciesName);
    setEditValue(speciesName);
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
          onKeyPress={(e) => e.key === 'Enter' && handleAddSpecies()}
          disabled={loading}
        />
        <Button onClick={handleAddSpecies} disabled={loading || !newSpecies.trim()}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          {loading ? 'Adding...' : 'Add Species'}
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
              <TableRow key={s}>
                <TableCell>{s}</TableCell>
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
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No species found. Add your first species above.
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
            <DialogTitle>Edit Species</DialogTitle>
            <DialogDescription>
              Update the species name. This will also update all animals using this species.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Species name..."
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEditSpecies()}
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
              onClick={handleEditSpecies} 
              disabled={loading || !editValue.trim() || editValue === editingSpecies}
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
