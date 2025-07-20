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
import { Pen, PlusCircle, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpeciesManagementProps {
  initialSpecies: string[];
}

export function SpeciesManagement({ initialSpecies }: SpeciesManagementProps) {
  const [species, setSpecies] = useState(initialSpecies);
  const [newSpecies, setNewSpecies] = useState('');
  const { toast } = useToast();

  const handleAddSpecies = () => {
    if (newSpecies && !species.map(s => s.toLowerCase()).includes(newSpecies.toLowerCase())) {
      // In a real app, you'd call an API here.
      setSpecies([...species, newSpecies].sort());
      setNewSpecies('');
      toast({ title: 'Success', description: `Species "${newSpecies}" added.` });
    } else if (!newSpecies) {
      toast({ variant: 'destructive', title: 'Error', description: 'Species name cannot be empty.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Species "${newSpecies}" already exists.` });
    }
  };

  const handleDeleteSpecies = (speciesToDelete: string) => {
    // In a real app, you'd call an API here.
    setSpecies(species.filter((s) => s !== speciesToDelete));
    toast({ title: 'Success', description: `Species "${speciesToDelete}" deleted.` });
  };
  
  // Note: Edit functionality would require more state management (e.g., dialogs or inline editing)
  // which is omitted here for simplicity. Users can delete and re-add.

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New species name..."
          value={newSpecies}
          onChange={(e) => setNewSpecies(e.target.value)}
        />
        <Button onClick={handleAddSpecies}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Species
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Species Name</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {species.map((s) => (
              <TableRow key={s}>
                <TableCell>{s}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" disabled>
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSpecies(s)}
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
