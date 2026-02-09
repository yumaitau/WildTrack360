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
import { 
  Pen, 
  PlusCircle, 
  Trash, 
  Save, 
  X, 
  AlertCircle,
  Calendar,
  FileText,
  User,
  Building,
  Clock
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface EnrichedCarer {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface Training {
  id: string;
  carerId: string;
  courseName: string;
  provider?: string | null;
  date: string;
  expiryDate?: string | null;
  certificateUrl?: string | null;
  notes?: string | null;
  carer: { id: string };
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function TrainingManagement() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [carers, setCarers] = useState<EnrichedCarer[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Add dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCarerId, setSelectedCarerId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [provider, setProvider] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [editCourseName, setEditCourseName] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editTrainingDate, setEditTrainingDate] = useState('');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editCertificateUrl, setEditCertificateUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [trainingToDelete, setTrainingToDelete] = useState<Training | null>(null);

  // Filter state
  const [filterCarerId, setFilterCarerId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const refreshTrainings = async () => {
    try {
      const orgId = organization?.id || 'default-org';
      const trainingsData = await apiJson<Training[]>(`/api/carer-training?orgId=${orgId}`);
      setTrainings(trainingsData);
    } catch (error) {
      console.error('Error refreshing trainings:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to refresh trainings.' });
    }
  };

  const refreshCarers = async () => {
    try {
      const orgId = organization?.id || 'default-org';
      const carersData = await apiJson<EnrichedCarer[]>(`/api/carers?orgId=${orgId}`);
      setCarers(carersData);
    } catch (error) {
      console.error('Error fetching carers:', error);
    }
  };

  useEffect(() => {
    refreshTrainings();
    refreshCarers();
  }, [organization]);

  const getExpiryStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return 'no-expiry';
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    
    if (isBefore(expiry, now)) return 'expired';
    if (isBefore(expiry, thirtyDaysFromNow)) return 'expiring-soon';
    return 'valid';
  };

  const getStatusBadge = (expiryDate: string | null | undefined) => {
    const status = getExpiryStatus(expiryDate);
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'expiring-soon':
        return <Badge variant="warning" className="bg-yellow-500">Expiring Soon</Badge>;
      case 'valid':
        return <Badge variant="success" className="bg-green-500">Valid</Badge>;
      default:
        return <Badge variant="secondary">No Expiry</Badge>;
    }
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesCarer = filterCarerId === 'all' || training.carerId === filterCarerId;
    const status = getExpiryStatus(training.expiryDate);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'expired' && status === 'expired') ||
      (filterStatus === 'expiring-soon' && status === 'expiring-soon') ||
      (filterStatus === 'valid' && status === 'valid');
    return matchesCarer && matchesStatus;
  });

  const openAddDialog = () => {
    setSelectedCarerId('');
    setCourseName('');
    setProvider('');
    setTrainingDate('');
    setExpiryDate('');
    setCertificateUrl('');
    setNotes('');
    setIsAddDialogOpen(true);
  };

  const handleAddTraining = async () => {
    if (!selectedCarerId || !courseName || !trainingDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
      return;
    }
    setLoading(true);
    try {
      await apiJson('/api/carer-training', {
        method: 'POST',
        body: JSON.stringify({
          carerId: selectedCarerId,
          courseName,
          provider,
          date: trainingDate,
          expiryDate: expiryDate || null,
          certificateUrl,
          notes,
          clerkOrganizationId: organization?.id
        })
      });
      setIsAddDialogOpen(false);
      await refreshTrainings();
      toast({ title: 'Success', description: 'Training certificate added successfully.' });
    } catch (error) {
      console.error('Error adding training:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add training certificate.' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (training: Training) => {
    setEditingTraining(training);
    setEditCourseName(training.courseName);
    setEditProvider(training.provider || '');
    setEditTrainingDate(training.date.split('T')[0]);
    setEditExpiryDate(training.expiryDate ? training.expiryDate.split('T')[0] : '');
    setEditCertificateUrl(training.certificateUrl || '');
    setEditNotes(training.notes || '');
    setIsEditDialogOpen(true);
  };

  const handleEditTraining = async () => {
    if (!editingTraining || !editCourseName || !editTrainingDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all required fields.' });
      return;
    }
    setLoading(true);
    try {
      await apiJson(`/api/carer-training/${editingTraining.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          courseName: editCourseName,
          provider: editProvider,
          date: editTrainingDate,
          expiryDate: editExpiryDate || null,
          certificateUrl: editCertificateUrl,
          notes: editNotes
        })
      });
      setIsEditDialogOpen(false);
      await refreshTrainings();
      toast({ title: 'Success', description: 'Training certificate updated successfully.' });
    } catch (error) {
      console.error('Error updating training:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update training certificate.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTraining = async () => {
    if (!trainingToDelete) return;
    setLoading(true);
    try {
      await apiJson(`/api/carer-training/${trainingToDelete.id}`, {
        method: 'DELETE'
      });
      setIsDeleteDialogOpen(false);
      await refreshTrainings();
      toast({ title: 'Success', description: 'Training certificate deleted successfully.' });
    } catch (error) {
      console.error('Error deleting training:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete training certificate.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={filterCarerId} onValueChange={setFilterCarerId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by carer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Carers</SelectItem>
            {carers.map(carer => (
              <SelectItem key={carer.id} value={carer.id}>
                {carer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
            <SelectItem value="valid">Valid</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <Button onClick={openAddDialog} disabled={loading}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Training Certificate
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expired Certificates</p>
              <p className="text-2xl font-bold text-red-600">
                {trainings.filter(t => getExpiryStatus(t.expiryDate) === 'expired').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Expiring Soon (30 days)</p>
              <p className="text-2xl font-bold text-yellow-600">
                {trainings.filter(t => getExpiryStatus(t.expiryDate) === 'expiring-soon').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Certificates</p>
              <p className="text-2xl font-bold">{trainings.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Training Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carer</TableHead>
              <TableHead>Course Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Training Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrainings.map((training) => (
              <TableRow key={training.id}>
                <TableCell className="font-medium">{carers.find(c => c.id === training.carerId)?.name || 'Unknown'}</TableCell>
                <TableCell>{training.courseName}</TableCell>
                <TableCell>{training.provider || '-'}</TableCell>
                <TableCell>{format(new Date(training.date), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {training.expiryDate 
                    ? format(new Date(training.expiryDate), 'dd/MM/yyyy')
                    : '-'
                  }
                </TableCell>
                <TableCell>{getStatusBadge(training.expiryDate)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(training)}
                    disabled={loading}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setTrainingToDelete(training);
                      setIsDeleteDialogOpen(true);
                    }}
                    disabled={loading}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredTrainings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No training certificates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Training Certificate</DialogTitle>
            <DialogDescription>
              Record a new training certificate for a carer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carer">Carer *</Label>
              <Select value={selectedCarerId} onValueChange={setSelectedCarerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a carer" />
                </SelectTrigger>
                <SelectContent>
                  {carers.map(carer => (
                    <SelectItem key={carer.id} value={carer.id}>
                      {carer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course Name *</Label>
              <Input
                id="course"
                placeholder="e.g., Wildlife First Aid"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Training Provider</Label>
              <Input
                id="provider"
                placeholder="e.g., NSW Wildlife Council"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Training Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={trainingDate}
                  onChange={(e) => setTrainingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="certificate">Certificate URL</Label>
              <Input
                id="certificate"
                placeholder="Link to certificate document"
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleAddTraining} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Save Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Training Certificate</DialogTitle>
            <DialogDescription>
              Update the training certificate details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Carer</Label>
              <Input value={carers.find(c => c.id === editingTraining?.carerId)?.name || ''} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-course">Course Name *</Label>
              <Input
                id="edit-course"
                value={editCourseName}
                onChange={(e) => setEditCourseName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-provider">Training Provider</Label>
              <Input
                id="edit-provider"
                value={editProvider}
                onChange={(e) => setEditProvider(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Training Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editTrainingDate}
                  onChange={(e) => setEditTrainingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-expiry">Expiry Date</Label>
                <Input
                  id="edit-expiry"
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-certificate">Certificate URL</Label>
              <Input
                id="edit-certificate"
                value={editCertificateUrl}
                onChange={(e) => setEditCertificateUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleEditTraining} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              Update Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Training Certificate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this training certificate for {carers.find(c => c.id === trainingToDelete?.carerId)?.name || 'this carer'}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={loading}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTraining} disabled={loading}>
              <Trash className="mr-2 h-4 w-4" />
              Delete Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}