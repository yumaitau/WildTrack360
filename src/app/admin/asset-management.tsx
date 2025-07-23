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
import { Pen, PlusCircle, Trash, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset, AssetType, assetTypes } from '@/lib/types';
import { getAssets, createAsset, updateAsset, deleteAsset } from '@/lib/data-store';

interface AssetManagementProps {
  initialAssets: Asset[];
}

export function AssetManagement({ initialAssets }: AssetManagementProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<AssetType>('Other');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<AssetType>('Other');
  const [editStatus, setEditStatus] = useState<'Available' | 'In Use' | 'Maintenance'>('Available');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Refresh assets list from data store
  const refreshAssets = async () => {
    try {
      const updatedAssets = await getAssets();
      setAssets(updatedAssets.sort((a, b) => a.name.localeCompare(b.name)));
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
  }, []);

  const handleAddAsset = async () => {
    if (!newAssetName.trim()) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Asset name cannot be empty.' 
      });
      return;
    }

    setLoading(true);
    try {
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        name: newAssetName.trim(),
        type: newAssetType,
        status: 'Available',
      };
      
      await createAsset(newAsset);
      setNewAssetName('');
      setNewAssetType('Other');
      await refreshAssets();
      toast({ 
        title: 'Success', 
        description: `Asset "${newAssetName.trim()}" added.` 
      });
    } catch (error) {
      console.error('Error adding asset:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to add asset.' 
      });
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
      await updateAsset(editingAsset.id, {
        name: editName.trim(),
        type: editType,
        status: editStatus
      });
      
      setEditingAsset(null);
      setEditName('');
      setEditType('Other');
      setEditStatus('Available');
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
      await deleteAsset(assetToDelete.id);
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
          onKeyPress={(e) => e.key === 'Enter' && handleAddAsset()}
          disabled={loading}
          className="flex-grow"
        />
        <Select 
          value={newAssetType} 
          onValueChange={(v) => setNewAssetType(v as AssetType)}
          disabled={loading}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleAddAsset} disabled={loading || !newAssetName.trim()}>
          <PlusCircle className="mr-2 h-4 w-4" /> 
          {loading ? 'Adding...' : 'Add Asset'}
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
                <TableCell>{asset.status}</TableCell>
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
              <Select value={editType} onValueChange={(v) => setEditType(v as AssetType)}>
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
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Use">In Use</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
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
