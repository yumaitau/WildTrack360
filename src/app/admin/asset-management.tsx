// src/app/admin/asset-management.tsx
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pen, PlusCircle, Trash, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset, AssetStatus } from '@prisma/client';
import { useUser, useOrganization } from '@clerk/nextjs';

// Constants for component compatibility
const assetTypes = ['Equipment', 'Cage', 'Tracker', 'Dataset', 'Other'] as const;
type AssetType = typeof assetTypes[number];

interface AssetManagementProps {
  initialAssets: Asset[];
}

// Helper to fetch JSON
async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function AssetManagement({ initialAssets }: AssetManagementProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<string>('Other');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<string>('Other');
  const [editStatus, setEditStatus] = useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Refresh assets list from data store
  const refreshAssets = async () => {
    if (!user || !organization) return;
    try {
      const updatedAssets = await apiJson<Asset[]>(`/api/assets?orgId=${organization.id}`);
      setAssets(updatedAssets.sort((a: Asset, b: Asset) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error refreshing assets:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to refresh assets list.' 
      });
    }
  };

  useEffect(() => {
    refreshAssets();
  }, [user, organization]);

  // Add dialog state fields
  const [addName, setAddName] = useState('');
  const [addType, setAddType] = useState<string>('Other');
  const [addStatus, setAddStatus] = useState<AssetStatus>(AssetStatus.AVAILABLE);
  const [addDescription, setAddDescription] = useState('');
  const [addLocation, setAddLocation] = useState('');
  const [addAssignedTo, setAddAssignedTo] = useState('');
  const [addPurchaseDate, setAddPurchaseDate] = useState('');
  const [addLastMaintenance, setAddLastMaintenance] = useState('');
  const [addNotes, setAddNotes] = useState('');

  const openAddDialog = () => {
    setAddName(newAssetName.trim());
    setAddType(newAssetType);
    setAddStatus(AssetStatus.AVAILABLE);
    setAddDescription('');
    setAddLocation('');
    setAddAssignedTo('');
    setAddPurchaseDate('');
    setAddLastMaintenance('');
    setAddNotes('');
    setIsAddDialogOpen(true);
  };

  const handleCreateAsset = async () => {
    if (!addName.trim() || !user || !organization) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Asset name is required.' 
      });
      return;
    }
    setLoading(true);
    try {
      await apiJson<Asset>(`/api/assets`, { method: 'POST', body: JSON.stringify({
        name: addName.trim(),
        type: addType,
        status: addStatus,
        description: addDescription || null,
        location: addLocation || null,
        assignedTo: addAssignedTo || null,
        purchaseDate: addPurchaseDate ? new Date(addPurchaseDate).toISOString() : null,
        lastMaintenance: addLastMaintenance ? new Date(addLastMaintenance).toISOString() : null,
        notes: addNotes || null,
        clerkUserId: user.id,
        clerkOrganizationId: organization.id
      }) });
      setNewAssetName('');
      setNewAssetType('Other');
      setIsAddDialogOpen(false);
      await refreshAssets();
      toast({ title: 'Success', description: `Asset "${addName.trim()}" added.` });
    } catch (error) {
      console.error('Error adding asset:', error);
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Failed to add asset.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAsset = async () => {
    if (!editingAsset || !editName.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Asset name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      await apiJson<Asset>(`/api/assets/${editingAsset.id}`, { method: 'PATCH', body: JSON.stringify({
        name: editName.trim(),
        type: editType,
        status: editStatus
      })});
      
      setEditingAsset(null);
      setEditName('');
      setEditType('Other');
      setEditStatus(AssetStatus.AVAILABLE);
      setIsEditDialogOpen(false);
      await refreshAssets();
      toast({ 
        title: 'Success', 
        description: `Asset "${editingAsset.name}" updated.` 
      });
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to update asset.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    setLoading(true);
    try {
      await apiJson<void>(`/api/assets/${assetToDelete.id}`, { method: 'DELETE' });
      setAssetToDelete(null);
      setIsDeleteDialogOpen(false);
      await refreshAssets();
      toast({ 
        title: 'Success', 
        description: `Asset "${assetToDelete.name}" deleted.` 
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to delete asset.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setEditName(asset.name);
    setEditType(asset.type);
    setEditStatus(asset.status);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (asset: Asset) => {
    setAssetToDelete(asset);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New asset name..."
          value={newAssetName}
          onChange={(e) => setNewAssetName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && openAddDialog()}
          disabled={loading}
          className="flex-grow"
        />
        <Select 
          value={newAssetType} 
          onValueChange={(v) => setNewAssetType(v as string)}
          disabled={loading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((type: AssetType) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openAddDialog} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Add Asset
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    asset.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                    asset.status === 'IN_USE' ? 'bg-blue-100 text-blue-700' :
                    asset.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-700' :
                    asset.status === 'RETIRED' ? 'bg-gray-100 text-gray-700' :
                    asset.status === 'LOST' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {asset.status === 'AVAILABLE' ? 'Available' :
                     asset.status === 'IN_USE' ? 'In Use' :
                     asset.status === 'MAINTENANCE' ? 'Maintenance' :
                     asset.status === 'RETIRED' ? 'Retired' :
                     asset.status === 'LOST' ? 'Lost' :
                     asset.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(asset)}
                    disabled={loading}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(asset)}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No assets found. Add your first asset above.
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
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>
              Update the asset details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Asset Name</label>
              <Input
                placeholder="Asset name..."
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEditAsset()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={editType} onValueChange={(v) => setEditType(v as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AssetStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AssetStatus.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={AssetStatus.IN_USE}>In Use</SelectItem>
                  <SelectItem value={AssetStatus.MAINTENANCE}>Maintenance</SelectItem>
                </SelectContent>
              </Select>
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
              onClick={handleEditAsset} 
              disabled={loading || !editName.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Asset Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Asset</DialogTitle>
            <DialogDescription>
              Provide details for the new asset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 max-h-[60vh] px-1">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="Asset name..." value={addName} onChange={(e) => setAddName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type: AssetType) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={addStatus} onValueChange={(v) => setAddStatus(v as AssetStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AssetStatus.AVAILABLE}>Available</SelectItem>
                  <SelectItem value={AssetStatus.IN_USE}>In Use</SelectItem>
                  <SelectItem value={AssetStatus.MAINTENANCE}>Maintenance</SelectItem>
                  <SelectItem value={AssetStatus.RETIRED}>Retired</SelectItem>
                  <SelectItem value={AssetStatus.LOST}>Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Description (optional)" value={addDescription} onChange={(e) => setAddDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Location (optional)" value={addLocation} onChange={(e) => setAddLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Input placeholder="Assigned to (optional)" value={addAssignedTo} onChange={(e) => setAddAssignedTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={addPurchaseDate} onChange={(e) => setAddPurchaseDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Last Maintenance</Label>
                <Input type="date" value={addLastMaintenance} onChange={(e) => setAddLastMaintenance(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Notes (optional)" value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleCreateAsset} disabled={loading}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Save Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{assetToDelete?.name}"? This action cannot be undone.
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
              onClick={handleDeleteAsset} 
              disabled={loading}
            >
              <Trash className="mr-2 h-4 w-4" />
              {loading ? 'Deleting...' : 'Delete Asset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
