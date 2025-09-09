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
import { Pen, PlusCircle, Trash, Save, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useOrganization } from '@clerk/nextjs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SpeciesCombobox } from '@/components/species-combobox';

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

interface SpeciesItem { id: string; name: string; scientificName?: string | null; type?: string | null; description?: string | null; careRequirements?: string | null }
interface SpeciesManagementProps { initialSpecies: string[] }

export function SpeciesManagement({ initialSpecies }: SpeciesManagementProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [editingSpecies, setEditingSpecies] = useState<SpeciesItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editScientificName, setEditScientificName] = useState('');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCareRequirements, setEditCareRequirements] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [speciesToDelete, setSpeciesToDelete] = useState<SpeciesItem | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  // Add search/filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addScientificName, setAddScientificName] = useState('');
  const [addType, setAddType] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addCareRequirements, setAddCareRequirements] = useState('');

  // Filter species based on search term and type
  const filteredSpecies = species.filter(s => {
    const matchesSearch = searchTerm === '' || 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.scientificName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = filterType === 'all' || (() => {
      const speciesType = s.type?.toLowerCase() || '';
      switch (filterType) {
        case 'mammal': return speciesType === 'mammal';
        case 'bird': return speciesType === 'bird';
        case 'reptile': return speciesType === 'reptile';
        case 'amphibian': return speciesType === 'amphibian';
        default: return true;
      }
    })();
    
    return matchesSearch && matchesType;
  });

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
    setAddName('');
    setAddScientificName('');
    setAddType('');
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
          type: addType || null,
          description: addDescription || null,
          careRequirements: addCareRequirements || null,
          clerkOrganizationId: organization?.id 
        }) 
      });
      setIsAddDialogOpen(false);
      setAddName('');
      setAddScientificName('');
      setAddType('');
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
          type: editType || null,
          description: editDescription || null,
          careRequirements: editCareRequirements || null
        }) 
      });
      setEditingSpecies(null);
      setEditName('');
      setEditScientificName('');
      setEditType('');
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
    setEditType(item.type || '');
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
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search species by name, scientific name, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mammal">Mammals</SelectItem>
            <SelectItem value="bird">Birds</SelectItem>
            <SelectItem value="reptile">Reptiles</SelectItem>
            <SelectItem value="amphibian">Amphibians</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Species Bar */}
      <div className="flex justify-end">
        <Button onClick={openAddDialog} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Add Species
        </Button>
      </div>
      
      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSpecies.length} of {species.length} species
        {searchTerm && ` matching "${searchTerm}"`}
        {filterType !== 'all' && ` (${filterType}s only)`}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Common Name</TableHead>
              <TableHead>Scientific Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Care Requirements</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSpecies.map((s) => (
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
                  {s.type ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {s.type}
                    </span>
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
            {filteredSpecies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {species.length === 0 
                    ? "No species found. Add your first species above."
                    : searchTerm || filterType !== 'all'
                    ? "No species match your search criteria. Try adjusting your filters."
                    : "No species found."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Species Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] mx-auto">
          <DialogHeader>
            <DialogTitle>Add Species</DialogTitle>
            <DialogDescription>
              Provide details for the new species.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Common Name *</Label>
              <div className="space-y-2">
                <SpeciesCombobox
                  value={addName}
                  onValueChange={setAddName}
                  onSpeciesSelect={(species) => {
                    setAddName(species.name);
                    if (species.scientificName) setAddScientificName(species.scientificName);
                    if (species.type) setAddType(species.type);
                  }}
                  placeholder="Select from existing species..."
                />
                <Input
                  id="add-name"
                  placeholder="Or enter a custom species name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                />
              </div>
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
              <Label htmlFor="add-type">Species Type</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger id="add-type">
                  <SelectValue placeholder="Select species type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mammal">Mammal</SelectItem>
                  <SelectItem value="Bird">Bird</SelectItem>
                  <SelectItem value="Reptile">Reptile</SelectItem>
                  <SelectItem value="Amphibian">Amphibian</SelectItem>
                </SelectContent>
              </Select>
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] mx-auto">
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
              <Label htmlFor="edit-type">Species Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select species type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mammal">Mammal</SelectItem>
                  <SelectItem value="Bird">Bird</SelectItem>
                  <SelectItem value="Reptile">Reptile</SelectItem>
                  <SelectItem value="Amphibian">Amphibian</SelectItem>
                </SelectContent>
              </Select>
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
