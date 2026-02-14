"use client";

import { useState, useEffect } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2, Edit2, Leaf, Users, Info, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SpeciesGroupWithCoordinators, OrgMemberWithAssignments } from '@/lib/types';

interface CoordinatorOption {
  orgMemberId: string;
  userId: string;
  name: string;
}

export function SpeciesGroupManagement() {
  const { organization } = useOrganization();
  const [groups, setGroups] = useState<SpeciesGroupWithCoordinators[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [memberNamesByOrgMemberId, setMemberNamesByOrgMemberId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SpeciesGroupWithCoordinators | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpeciesNames, setFormSpeciesNames] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [groupsRes, rolesRes, membersRes] = await Promise.all([
        fetch('/api/rbac/species-groups'),
        fetch('/api/rbac/roles'),
        organization.getMemberships(),
      ]);

      if (groupsRes.ok) {
        setGroups(await groupsRes.json());
      }

      // Build coordinator options from RBAC roles + Clerk identity
      if (rolesRes.ok) {
        const orgMembers: OrgMemberWithAssignments[] = await rolesRes.json();
        const clerkMembers = membersRes.data as any[];

        // Build a name lookup for ALL org members (for display purposes)
        const nameMap: Record<string, string> = {};
        for (const m of orgMembers) {
          const clerk = clerkMembers.find(
            (cm: any) => cm.publicUserData?.userId === m.userId
          );
          const name = clerk
            ? [clerk.publicUserData?.firstName, clerk.publicUserData?.lastName]
                .filter(Boolean)
                .join(' ') || clerk.publicUserData?.identifier
            : null;
          nameMap[m.id] = name || 'Unknown';
        }
        setMemberNamesByOrgMemberId(nameMap);

        const coordinatorMembers = orgMembers.filter(
          (m) => m.role === 'COORDINATOR'
        );

        const options: CoordinatorOption[] = coordinatorMembers.map((m) => ({
          orgMemberId: m.id,
          userId: m.userId,
          name: nameMap[m.id] || 'Unknown',
        }));

        setCoordinators(options);
      }
    } catch (error) {
      console.error('Error fetching species groups:', error);
      toast.error('Failed to load species groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organization) return;
    fetchData();
  }, [organization?.id]);

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormSpeciesNames('');
    setEditingGroup(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreate = async () => {
    if (!formName || !formSpeciesNames) {
      toast.error('Name and species names are required');
      return;
    }

    const slug = formSlug || generateSlug(formName);
    const speciesNames = formSpeciesNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch('/api/rbac/species-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: formName,
          description: formDescription || undefined,
          speciesNames,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create species group');
      }

      toast.success('Species group created');
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingGroup) return;

    const speciesNames = formSpeciesNames
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!formName || speciesNames.length === 0) {
      toast.error('Name and species names are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/rbac/species-groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          slug: formSlug || generateSlug(formName),
          description: formDescription || undefined,
          speciesNames,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update species group');
      }

      toast.success('Species group updated');
      setEditingGroup(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    try {
      const res = await fetch(`/api/rbac/species-groups/${groupId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete species group');
      }

      toast.success('Species group deleted');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleAssignCoordinator = async (
    orgMemberId: string,
    speciesGroupId: string
  ) => {
    try {
      const res = await fetch('/api/rbac/coordinator-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgMemberId, speciesGroupId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign coordinator');
      }

      toast.success('Coordinator assigned');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign');
    }
  };

  const handleRemoveCoordinator = async (
    orgMemberId: string,
    speciesGroupId: string
  ) => {
    try {
      const res = await fetch('/api/rbac/coordinator-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgMemberId, speciesGroupId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove coordinator');
      }

      toast.success('Coordinator removed');
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to remove'
      );
    }
  };

  const openEdit = (group: SpeciesGroupWithCoordinators) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormSlug(group.slug);
    setFormDescription(group.description || '');
    setFormSpeciesNames(group.speciesNames.join(', '));
  };

  if (!organization) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No organization found.
        </AlertDescription>
      </Alert>
    );
  }

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name</Label>
        <Input
          id="group-name"
          placeholder="e.g. Macropods"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
            if (!editingGroup) {
              setFormSlug(generateSlug(e.target.value));
            }
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-slug">Slug</Label>
        <Input
          id="group-slug"
          placeholder="e.g. macropods"
          value={formSlug}
          onChange={(e) => setFormSlug(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Machine-readable identifier. Auto-generated from name.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-description">Description</Label>
        <Input
          id="group-description"
          placeholder="Optional description"
          value={formDescription}
          onChange={(e) => setFormDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="group-species">Species Names (comma-separated)</Label>
        <Textarea
          id="group-species"
          placeholder="e.g. Kangaroo, Wallaby, Wallaroo, Pademelon"
          value={formSpeciesNames}
          onChange={(e) => setFormSpeciesNames(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          These names are matched against the species field on animal records.
          Use the same names you use when adding animals.
        </p>
      </div>
      {editingGroup && (() => {
        const editCoordinatorAssignments = editingGroup.coordinators.filter(
          (c) => c.orgMember.role === 'COORDINATOR'
        );
        return (
        <div className="space-y-2">
          <Label>Coordinators</Label>
          {editCoordinatorAssignments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {editCoordinatorAssignments.map((c) => {
                const coord = coordinators.find(
                  (co) => co.orgMemberId === c.orgMemberId
                );
                return (
                  <Badge key={c.id} variant="secondary" className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {coord?.name || memberNamesByOrgMemberId[c.orgMemberId] || 'Unknown'}
                    <button
                      className="ml-1 hover:text-destructive"
                      onClick={() =>
                        handleRemoveCoordinator(c.orgMemberId, editingGroup.id)
                      }
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          {(() => {
            const assignedIds = editCoordinatorAssignments.map(
              (c) => c.orgMember.userId
            );
            const available = coordinators.filter(
              (c) => !assignedIds.includes(c.userId)
            );
            return available.length > 0 ? (
              <Select
                onValueChange={(orgMemberId) =>
                  handleAssignCoordinator(orgMemberId, editingGroup.id)
                }
              >
                <SelectTrigger className="w-full h-8">
                  <SelectValue placeholder="Add coordinator..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c.orgMemberId} value={c.orgMemberId}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : coordinators.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No coordinators in org. Assign the Coordinator role first.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                All coordinators already assigned.
              </p>
            );
          })()}
        </div>
        );
      })()}
    </div>
  );

  return (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50">
        <Leaf className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Species Groups</AlertTitle>
        <AlertDescription className="text-green-800">
          Species groups define which animals a Coordinator can see and manage.
          Each group contains a list of species names that are matched against animal records.
          Assign one or more coordinators to each group.
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Species Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Species Group</DialogTitle>
              <DialogDescription>
                Define a new species group for your organisation.
              </DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => { if (!open) { setEditingGroup(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Species Group</DialogTitle>
            <DialogDescription>
              Update the species group details.
            </DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingGroup(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="h-5 w-5" />
            Species Groups
          </CardTitle>
          <CardDescription>
            Manage species groups and assign coordinators.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading species groups...
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No species groups defined yet. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Coordinators</TableHead>
                  <TableHead>Assign Coordinator</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => {
                  // Only show actual coordinators (not carers) in the Coordinators column
                  const coordinatorAssignments = group.coordinators.filter(
                    (c) => c.orgMember.role === 'COORDINATOR'
                  );
                  const assignedCoordinatorIds = coordinatorAssignments.map(
                    (c) => c.orgMember.userId
                  );
                  const availableCoordinators = coordinators.filter(
                    (c) => !assignedCoordinatorIds.includes(c.userId)
                  );

                  return (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.slug}
                          </div>
                          {group.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {group.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {group.speciesNames.map((name) => (
                            <Badge key={name} variant="outline" className="text-xs">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {coordinatorAssignments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            None assigned
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {coordinatorAssignments.map((c) => {
                              const coord = coordinators.find(
                                (co) => co.orgMemberId === c.orgMemberId
                              );
                              return (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-1"
                                >
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {coord?.name || memberNamesByOrgMemberId[c.orgMemberId] || 'Unknown'}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0"
                                    onClick={() =>
                                      handleRemoveCoordinator(
                                        c.orgMemberId,
                                        group.id
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {availableCoordinators.length > 0 ? (
                          <Select
                            onValueChange={(orgMemberId) =>
                              handleAssignCoordinator(orgMemberId, group.id)
                            }
                          >
                            <SelectTrigger className="w-[160px] h-8">
                              <SelectValue placeholder="Add coordinator" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCoordinators.map((c) => (
                                <SelectItem key={c.orgMemberId} value={c.orgMemberId}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {coordinators.length === 0
                              ? 'No coordinators in org'
                              : 'All assigned'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(group)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Species Group
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete &ldquo;{group.name}&rdquo;?
                                  This will remove all coordinator assignments for this group.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(group.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
