"use client";

import { useState, useEffect, useMemo } from 'react';
import { useOrganization } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PlusCircle, Trash2, Edit2, Leaf, Users, Info, X, Plus, Check, ChevronRight, ChevronLeft, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { SpeciesGroupWithCoordinators, OrgMemberWithAssignments } from '@/lib/types';

// ---------------------------------------------------------------------------
// SpeciesNamePicker (unchanged)
// ---------------------------------------------------------------------------

function SpeciesNamePicker({
  selected,
  onChange,
  availableSpecies,
}: {
  selected: string[];
  onChange: (names: string[]) => void;
  availableSpecies: string[];
}) {
  const [customInput, setCustomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const selectedSet = new Set(selected.map((s) => s.toLowerCase()));

  const handleToggle = (name: string) => {
    if (selectedSet.has(name.toLowerCase())) {
      onChange(selected.filter((s) => s.toLowerCase() !== name.toLowerCase()));
    } else {
      onChange([...selected, name]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selectedSet.has(trimmed.toLowerCase())) {
      toast.error(`"${trimmed}" is already selected`);
      return;
    }
    onChange([...selected, trimmed]);
    setCustomInput('');
  };

  const filteredSpecies = useMemo(() => {
    if (!searchQuery.trim()) return availableSpecies;
    const q = searchQuery.toLowerCase();
    return availableSpecies.filter((name) => name.toLowerCase().includes(q));
  }, [availableSpecies, searchQuery]);

  // Custom species that aren't in the org list
  const customSelected = selected.filter(
    (s) => !availableSpecies.some((a) => a.toLowerCase() === s.toLowerCase())
  );

  return (
    <div className="space-y-3">
      {/* Selected species badges */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => {
            const isCustom = !availableSpecies.some((a) => a.toLowerCase() === name.toLowerCase());
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleToggle(name)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                  isCustom
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                    : 'bg-primary/10 text-primary border border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                }`}
              >
                {name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* Search box */}
      {availableSpecies.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${availableSpecies.length} species...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
      )}

      {/* Species list */}
      {availableSpecies.length > 0 && (
        <div className="border rounded-md max-h-[200px] overflow-y-auto">
          {filteredSpecies.length === 0 ? (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              No species match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredSpecies.map((name) => {
              const isSelected = selectedSet.has(name.toLowerCase());
              return (
                <label
                  key={name}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-sm"
                >
                  <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className={isSelected ? 'font-medium' : 'text-muted-foreground'}>{name}</span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => handleToggle(name)}
                  />
                </label>
              );
            })
          )}
        </div>
      )}

      {/* Add custom species */}
      <div className="flex gap-2">
        <Input
          placeholder="Add unlisted species..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 shrink-0"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {selected.length} species selected
        {searchQuery && ` \u00B7 showing ${filteredSpecies.length} of ${availableSpecies.length}`}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoordinatorOption {
  orgMemberId: string;
  userId: string;
  name: string;
}

type WizardStep = 'details' | 'species' | 'coordinators' | 'review';
const WIZARD_STEPS: { key: WizardStep; label: string }[] = [
  { key: 'details', label: 'Group Details' },
  { key: 'species', label: 'Select Species' },
  { key: 'coordinators', label: 'Assign People' },
  { key: 'review', label: 'Review & Save' },
];

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

function StepIndicator({ currentStep, steps }: { currentStep: WizardStep; steps: typeof WIZARD_STEPS }) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isComplete = idx < currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={`text-xs truncate hidden sm:inline ${
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assignment Overview
// ---------------------------------------------------------------------------

function AssignmentOverview({
  groups,
  coordinators,
  memberNamesByOrgMemberId,
}: {
  groups: SpeciesGroupWithCoordinators[];
  coordinators: CoordinatorOption[];
  memberNamesByOrgMemberId: Record<string, string>;
}) {
  // Build a map: coordinator orgMemberId → { orgMemberId, name, groups[] }
  const assignmentMap = useMemo(() => {
    const coordinatorIds = new Set(coordinators.map((c) => c.orgMemberId));
    const map = new Map<string, { orgMemberId: string; name: string; groups: string[] }>();

    // First, add all coordinators (even unassigned ones)
    for (const c of coordinators) {
      map.set(c.orgMemberId, { orgMemberId: c.orgMemberId, name: c.name, groups: [] });
    }

    // Then, populate their assigned groups (only for active coordinator roles)
    for (const group of groups) {
      for (const assignment of group.coordinators) {
        const isActiveCoordinator =
          coordinatorIds.has(assignment.orgMemberId) ||
          assignment.orgMember?.role === 'COORDINATOR' ||
          assignment.orgMember?.role === 'COORDINATOR_ALL';
        if (!isActiveCoordinator) continue;

        const existing = map.get(assignment.orgMemberId);
        if (existing) {
          existing.groups.push(group.name);
        } else {
          const name = memberNamesByOrgMemberId[assignment.orgMemberId] || 'Unknown';
          map.set(assignment.orgMemberId, { orgMemberId: assignment.orgMemberId, name, groups: [group.name] });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, coordinators, memberNamesByOrgMemberId]);

  const unassignedGroups = useMemo(() => {
    const coordinatorIds = new Set(coordinators.map((c) => c.orgMemberId));
    return groups.filter((g) => {
      const activeAssignments = g.coordinators.filter(
        (c) =>
          coordinatorIds.has(c.orgMemberId) ||
          c.orgMember?.role === 'COORDINATOR' ||
          c.orgMember?.role === 'COORDINATOR_ALL'
      );
      return activeAssignments.length === 0;
    });
  }, [groups, coordinators]);

  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Assignment Overview
        </CardTitle>
        <CardDescription>
          At-a-glance view of who manages which species groups.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Coordinator → Groups mapping */}
          {assignmentMap.length > 0 && (
            <div className="space-y-2">
              {assignmentMap.map((entry) => (
                <div
                  key={entry.orgMemberId}
                  className="flex items-start gap-3 py-2 border-b last:border-b-0"
                >
                  <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">
                    <Users className="h-3 w-3 mr-1" />
                    {entry.name}
                  </Badge>
                  <div className="flex items-center gap-1 flex-wrap">
                    {entry.groups.length > 0 ? (
                      <>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        {entry.groups.map((g) => (
                          <Badge key={g} variant="outline" className="text-xs">
                            <Leaf className="h-3 w-3 mr-1" />
                            {g}
                          </Badge>
                        ))}
                      </>
                    ) : (
                      <span className="text-xs text-amber-600 italic">
                        No species groups assigned
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warning for unassigned groups */}
          {unassignedGroups.length > 0 && (
            <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
              <Info className="h-4 w-4" />
              <AlertTitle className="text-sm">Unassigned Groups</AlertTitle>
              <AlertDescription className="text-xs">
                The following groups have no coordinator assigned:{' '}
                {unassignedGroups.map((g) => g.name).join(', ')}.
                Use the wizard or edit the group to assign someone.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SpeciesGroupManagement() {
  const { organization } = useOrganization();
  const [groups, setGroups] = useState<SpeciesGroupWithCoordinators[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorOption[]>([]);
  const [memberNamesByOrgMemberId, setMemberNamesByOrgMemberId] = useState<Record<string, string>>({});
  const [orgSpecies, setOrgSpecies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SpeciesGroupWithCoordinators | null>(null);

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('details');
  const [wizardCoordinatorIds, setWizardCoordinatorIds] = useState<string[]>([]);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSpeciesNames, setFormSpeciesNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      const [groupsRes, rolesRes, membersRes, speciesRes] = await Promise.all([
        fetch('/api/rbac/species-groups'),
        fetch('/api/rbac/roles'),
        organization.getMemberships(),
        fetch(`/api/species?orgId=${organization.id}`),
      ]);

      if (groupsRes.ok) {
        setGroups(await groupsRes.json());
      }

      if (speciesRes.ok) {
        const speciesData: { name: string }[] = await speciesRes.json();
        setOrgSpecies(speciesData.map((s) => s.name).sort());
      }

      if (rolesRes.ok) {
        const orgMembers: OrgMemberWithAssignments[] = await rolesRes.json();
        const clerkMembers = membersRes.data as any[];

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
          (m) => m.role === 'COORDINATOR' || m.role === 'COORDINATOR_ALL'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormSpeciesNames([]);
    setEditingGroup(null);
    setWizardStep('details');
    setWizardCoordinatorIds([]);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Create + assign coordinators in one flow
  const handleWizardCreate = async () => {
    if (!formName || formSpeciesNames.length === 0) {
      toast.error('Name and species names are required');
      return;
    }

    const slug = formSlug || generateSlug(formName);

    setSaving(true);
    try {
      const res = await fetch('/api/rbac/species-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: formName,
          description: formDescription || undefined,
          speciesNames: formSpeciesNames,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create species group');
      }

      const created = await res.json();

      // Assign selected coordinators
      if (wizardCoordinatorIds.length > 0) {
        const assignmentResponses = await Promise.all(
          wizardCoordinatorIds.map((orgMemberId) =>
            fetch('/api/rbac/coordinator-assignments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orgMemberId, speciesGroupId: created.id }),
            })
          )
        );

        const failedAssignments = assignmentResponses.filter((r) => !r.ok);
        if (failedAssignments.length > 0) {
          toast.error(
            `Species group created but ${failedAssignments.length} coordinator assignment(s) failed`
          );
        } else {
          toast.success('Species group created and coordinators assigned');
        }
      } else {
        toast.success('Species group created');
      }
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

    if (!formName || formSpeciesNames.length === 0) {
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
          speciesNames: formSpeciesNames,
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
    setFormSpeciesNames([...group.speciesNames]);
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

  // ---------------------------------------------------------------------------
  // Wizard step validation
  // ---------------------------------------------------------------------------

  const canAdvanceFrom = (step: WizardStep): boolean => {
    switch (step) {
      case 'details':
        return formName.trim().length > 0;
      case 'species':
        return formSpeciesNames.length > 0;
      case 'coordinators':
        return true; // optional
      case 'review':
        return true;
    }
  };

  const nextStep = () => {
    const idx = WIZARD_STEPS.findIndex((s) => s.key === wizardStep);
    if (idx < WIZARD_STEPS.length - 1) setWizardStep(WIZARD_STEPS[idx + 1].key);
  };

  const prevStep = () => {
    const idx = WIZARD_STEPS.findIndex((s) => s.key === wizardStep);
    if (idx > 0) setWizardStep(WIZARD_STEPS[idx - 1].key);
  };

  // ---------------------------------------------------------------------------
  // Wizard step content
  // ---------------------------------------------------------------------------

  const renderWizardStep = () => {
    switch (wizardStep) {
      case 'details':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Give your species group a name and optional description. The slug is auto-generated from the name.
            </p>
            <div className="space-y-2">
              <Label htmlFor="wizard-name">Group Name <span className="text-destructive">*</span></Label>
              <Input
                id="wizard-name"
                placeholder="e.g. Macropods"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormSlug(generateSlug(e.target.value));
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-slug">Slug</Label>
              <Input
                id="wizard-slug"
                placeholder="e.g. macropods"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Machine-readable identifier. Auto-generated from name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wizard-description">Description</Label>
              <Input
                id="wizard-description"
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
        );

      case 'species':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the species that belong to this group. These determine which animal records coordinators assigned to this group can see and manage.
            </p>
            <div className="space-y-2">
              <Label>Species Names <span className="text-destructive">*</span></Label>
              <SpeciesNamePicker
                selected={formSpeciesNames}
                onChange={setFormSpeciesNames}
                availableSpecies={orgSpecies}
              />
              <p className="text-xs text-muted-foreground">
                Click species to add or remove them. Use the input to add species not yet in your org list.
              </p>
            </div>
          </div>
        );

      case 'coordinators':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign coordinators who will manage animals in this species group. This step is optional — you can assign coordinators later.
            </p>
            {coordinators.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No coordinators found in your organisation. You can assign the Coordinator role to members in the People tab, then come back to assign them here.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label>Available Coordinators</Label>
                <div className="border rounded-md max-h-[250px] overflow-y-auto">
                  {coordinators.map((c) => {
                    const isSelected = wizardCoordinatorIds.includes(c.orgMemberId);
                    return (
                      <label
                        key={c.orgMemberId}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-sm"
                      >
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={isSelected ? 'font-medium' : ''}>{c.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => {
                            setWizardCoordinatorIds((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== c.orgMemberId)
                                : [...prev, c.orgMemberId]
                            );
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {wizardCoordinatorIds.length} coordinator{wizardCoordinatorIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review the details below before creating the species group.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Group Name</p>
                <p className="text-sm font-semibold">{formName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Slug</p>
                <p className="text-sm font-mono">{formSlug || generateSlug(formName)}</p>
              </div>
              {formDescription && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm">{formDescription}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Species ({formSpeciesNames.length})</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formSpeciesNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Coordinators ({wizardCoordinatorIds.length})
                </p>
                {wizardCoordinatorIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {wizardCoordinatorIds.map((id) => {
                      const c = coordinators.find((co) => co.orgMemberId === id);
                      return (
                        <Badge key={id} variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {c?.name || 'Unknown'}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    None — you can assign coordinators later
                  </p>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // Edit form content (kept similar to original for edit modal)
  // ---------------------------------------------------------------------------

  const editFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name</Label>
        <Input
          id="group-name"
          placeholder="e.g. Macropods"
          value={formName}
          onChange={(e) => {
            setFormName(e.target.value);
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
          Machine-readable identifier.
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
        <Label>Species Names</Label>
        <SpeciesNamePicker
          selected={formSpeciesNames}
          onChange={setFormSpeciesNames}
          availableSpecies={orgSpecies}
        />
        <p className="text-xs text-muted-foreground">
          Click species to add or remove them. Use the input to add species not yet in your org list.
        </p>
      </div>
      {editingGroup && (() => {
        const editCoordinatorAssignments = editingGroup.coordinators.filter(
          (c) => c.orgMember.role === 'COORDINATOR' || c.orgMember.role === 'COORDINATOR_ALL'
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
          Use the wizard below to create a group and assign coordinators in one step.
        </AlertDescription>
      </Alert>

      {/* Assignment Overview */}
      <AssignmentOverview
        groups={groups}
        coordinators={coordinators}
        memberNamesByOrgMemberId={memberNamesByOrgMemberId}
      />

      <div className="flex justify-end">
        {/* Create Wizard Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Species Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] flex flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Species Group</DialogTitle>
              <DialogDescription>
                Follow the steps to create a species group and assign coordinators.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-1">
              <StepIndicator currentStep={wizardStep} steps={WIZARD_STEPS} />
              {renderWizardStep()}
            </div>
            <DialogFooter className="flex-row justify-between sm:justify-between gap-2 pt-4 border-t">
              <div>
                {wizardStep !== 'details' && (
                  <Button variant="outline" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                {wizardStep === 'review' ? (
                  <Button onClick={handleWizardCreate} disabled={saving}>
                    {saving ? 'Creating...' : 'Create Group'}
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    disabled={!canAdvanceFrom(wizardStep)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => { if (!open) { setEditingGroup(null); resetForm(); } }}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Species Group</DialogTitle>
            <DialogDescription>
              Update the species group details and coordinator assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 px-1">
            {editFormContent}
          </div>
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
              No species groups defined yet. Click &ldquo;Create Species Group&rdquo; to get started.
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
                  const coordinatorAssignments = group.coordinators.filter(
                    (c) => c.orgMember.role === 'COORDINATOR' || c.orgMember.role === 'COORDINATOR_ALL'
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
