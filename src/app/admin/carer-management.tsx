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

interface CarerManagementProps {
  initialCarers: string[];
}

export function CarerManagement({ initialCarers }: CarerManagementProps) {
  const [carers, setCarers] = useState(initialCarers);
  const [newCarer, setNewCarer] = useState('');
  const { toast } = useToast();

  const handleAddCarer = () => {
    if (newCarer && !carers.map(c => c.toLowerCase()).includes(newCarer.toLowerCase())) {
       // In a real app, you'd call an API here.
      setCarers([...carers, newCarer].sort());
      setNewCarer('');
      toast({ title: 'Success', description: `Carer "${newCarer}" added.` });
    } else if (!newCarer) {
      toast({ variant: 'destructive', title: 'Error', description: 'Carer name cannot be empty.' });
    } else {
       toast({ variant: 'destructive', title: 'Error', description: `Carer "${newCarer}" already exists.` });
    }
  };

  const handleDeleteCarer = (carerToDelete: string) => {
    // In a real app, you'd call an API here.
    setCarers(carers.filter((c) => c !== carerToDelete));
    toast({ title: 'Success', description: `Carer "${carerToDelete}" deleted.` });
  };
  
  // Note: Edit functionality would require more state management (e.g., dialogs or inline editing)
  // which is omitted here for simplicity. Users can delete and re-add.

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="New carer name..."
          value={newCarer}
          onChange={(e) => setNewCarer(e.target.value)}
        />
        <Button onClick={handleAddCarer}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Carer
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carer Name</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {carers.map((c) => (
              <TableRow key={c}>
                <TableCell>{c}</TableCell>
                <TableCell className="text-right">
                   <Button variant="ghost" size="icon" disabled>
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCarer(c)}
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
