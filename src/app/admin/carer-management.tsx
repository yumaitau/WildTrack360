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
import { getCarers, createCarer, updateCarer, deleteCarer } from '@/lib/data-store';

interface CarerManagementProps {
  initialCarers: string[];
}

export function CarerManagement({ initialCarers }: CarerManagementProps) {
  const [carers, setCarers] = useState<string[]>(initialCarers);
  const [newCarer, setNewCarer] = useState('');
  const [editingCarer, setEditingCarer] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [carerToDelete, setCarerToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Refresh carers list from data store
  const refreshCarers = async () => {
    try {
      const updatedCarers = await getCarers();
      setCarers(updatedCarers);
    } catch (error) {
      console.error('Error refreshing carers:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to refresh carers list.' 
      });
    }
  };

  useEffect(() => {
    refreshCarers();
  }, []);

  const handleAddCarer = async () => {
    if (!newCarer.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Carer name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      await createCarer(newCarer.trim());
      setNewCarer('');
      await refreshCarers();
      toast({ 
        title: 'Success', 
        description: `Carer "${newCarer.trim()}" added.` 
      });
    } catch (error) {
      console.error('Error adding carer:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add carer.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCarer = async () => {
    if (!editingCarer || !editValue.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Carer name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      await updateCarer(editingCarer, editValue.trim());
      setEditingCarer(null);
      setEditValue('');
      setIsEditDialogOpen(false);
      await refreshCarers();
      toast({ 
        title: 'Success', 
        description: `Carer "${editingCarer}" updated to "${editValue.trim()}".` 
      });
    } catch (error) {
      console.error('Error updating carer:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update carer.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCarer = async () => {
    if (!carerToDelete) return;

    setLoading(true);
    try {
      await deleteCarer(carerToDelete);
      setCarerToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshCarers();
      toast({ 
        title: 'Success', 
        description: `Carer "${carerToDelete}" deleted.` 
      });
    } catch (error) {
      console.error('Error deleting carer:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete carer.' 
      });
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
          onKeyPress={(e) => e.key === 'Enter' && handleAddCarer()}
          disabled={loading}
        />
        <Button onClick={handleAddCarer} disabled={loading || !newCarer.trim()}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          {loading ? 'Adding...' : 'Add Carer'}
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
