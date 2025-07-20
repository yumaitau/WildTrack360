// src/app/admin/asset-management.tsx
"use client";

import { useState } from 'react';
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
import { Pen, PlusCircle, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Asset, AssetType, assetTypes } from '@/lib/types';

interface AssetManagementProps {
  initialAssets: Asset[];
}

export function AssetManagement({ initialAssets }: AssetManagementProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<AssetType>('Other');
  const { toast } = useToast();

  const handleAddAsset = () => {
    if (newAssetName && newAssetType) {
       // In a real app, you'd call an API here.
      const newAsset: Asset = {
        id: `asset-${Date.now()}`,
        name: newAssetName,
        type: newAssetType,
        status: 'Available',
      }
      setAssets([...assets, newAsset].sort((a,b) => a.name.localeCompare(b.name)));
      setNewAssetName('');
      setNewAssetType('Other');
      toast({ title: 'Success', description: `Asset "${newAssetName}" added.` });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Asset name and type are required.' });
    }
  };

  const handleDeleteAsset = (assetIdToDelete: string) => {
    // In a real app, you'd call an API here.
    const assetName = assets.find(a => a.id === assetIdToDelete)?.name;
    setAssets(assets.filter((a) => a.id !== assetIdToDelete));
    toast({ title: 'Success', description: `Asset "${assetName}" deleted.` });
  };
  
  // Note: Edit functionality would require a dialog, omitted for simplicity.

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New asset name..."
          value={newAssetName}
          onChange={(e) => setNewAssetName(e.target.value)}
          className="flex-grow"
        />
        <Select value={newAssetType} onValueChange={(v) => setNewAssetType(v as AssetType)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
                {assetTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Button onClick={handleAddAsset}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Asset
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell>{asset.status}</TableCell>
                <TableCell className="text-right">
                   <Button variant="ghost" size="icon" disabled>
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
