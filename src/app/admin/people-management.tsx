"use client";

import { useState, useEffect, useRef } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  UserPlus, Users, Trash2, Mail, Info, Clock, X, Pen, Save,
  Shield, ShieldCheck, ShieldAlert, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { SpeciesGroupBadges } from './species-group-badges';
import type { OrgMemberWithAssignments, SpeciesGroupWithCoordinators, EnrichedCarer } from '@/lib/types';

const MAX_USERS = 25;

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────

interface ClerkMember {
  id: string;
  publicUserData: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    identifier: string;
  };
  role: string;
  createdAt: string;
}

interface ClerkInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: string;
}

interface PeopleMember {
  clerkMembershipId: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  email: string;
  joinedAt: string;
  role: 'ADMIN' | 'COORDINATOR' | 'CARER' | null;
  orgMemberId: string | null;
  speciesAssignments: OrgMemberWithAssignments['speciesAssignments'];
  carerProfile: EnrichedCarer | null;
  hasProfile: boolean;
}

// ── Component ──────────────────────────────────────────────────────────

export function PeopleManagement() {
  const { organization, membership } = useOrganization();
  const { user } = useUser();

  // Data state
  const [people, setPeople] = useState<PeopleMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<ClerkInvitation[]>([]);
  const [speciesGroups, setSpeciesGroups] = useState<SpeciesGroupWithCoordinators[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  // Action state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  // Edit profile dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCarer, setEditingCarer] = useState<EnrichedCarer | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editLicenseNumber, setEditLicenseNumber] = useState('');
  const [editJurisdiction, setEditJurisdiction] = useState('');
  const [editSpecialtiesText, setEditSpecialtiesText] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editStreetAddress, setEditStreetAddress] = useState('');
  const [editSuburb, setEditSuburb] = useState('');
  const [editState, setEditState] = useState('NSW');
  const [editPostcode, setEditPostcode] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────

  // Keep a stable ref to organization so refreshAll never triggers re-renders
  const orgRef = useRef(organization);
  orgRef.current = organization;

  const refreshAll = async () => {
    const org = orgRef.current;
    if (!org) return;
    setLoading(true);
    try {
      const orgId = org.id;

      // Fetch all sources in parallel
      const [membersList, invitationsList, rolesRes, groupsRes, carersData] = await Promise.all([
        org.getMemberships(),
        org.getInvitations(),
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/species-groups'),
        apiJson<EnrichedCarer[]>(`/api/carers?orgId=${orgId}`),
      ]);

      const clerkMembers = membersList.data as unknown as ClerkMember[];
      const invitations = invitationsList.data.filter(inv => inv.status === 'pending') as unknown as ClerkInvitation[];

      const orgMembers: OrgMemberWithAssignments[] = rolesRes.ok ? await rolesRes.json() : [];
      const groups: SpeciesGroupWithCoordinators[] = groupsRes.ok ? await groupsRes.json() : [];

      // Build lookup maps
      const rolesByUserId = new Map<string, OrgMemberWithAssignments>();
      for (const m of orgMembers) {
        rolesByUserId.set(m.userId, m);
      }

      const carersByUserId = new Map<string, EnrichedCarer>();
      for (const c of carersData) {
        // EnrichedCarer.id is the carer's userId (set by the API)
        carersByUserId.set(c.id, c);
      }

      // Merge into PeopleMember[]
      const merged: PeopleMember[] = clerkMembers.map((cm) => {
        const userId = cm.publicUserData.userId;
        const rbac = rolesByUserId.get(userId);
        const carer = carersByUserId.get(userId);

        return {
          clerkMembershipId: cm.id,
          userId,
          firstName: cm.publicUserData.firstName,
          lastName: cm.publicUserData.lastName,
          imageUrl: cm.publicUserData.imageUrl,
          email: cm.publicUserData.identifier,
          joinedAt: cm.createdAt,
          role: rbac?.role ?? null,
          orgMemberId: rbac?.id ?? null,
          speciesAssignments: rbac?.speciesAssignments ?? [],
          carerProfile: carer ?? null,
          hasProfile: carer?.hasProfile ?? false,
        };
      });

      setPeople(merged);
      setPendingInvitations(invitations);
      setSpeciesGroups(groups);
    } catch (error) {
      console.error('Error loading people data:', error);
      toast.error('Failed to load people data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organization) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  // ── Invite handlers ────────────────────────────────────────────────

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    if (!inviteEmail) { toast.error('Please enter an email address'); return; }
    if (people.length >= MAX_USERS) { toast.error(`Maximum of ${MAX_USERS} users per organization reached`); return; }
    if (!validateEmail(inviteEmail)) { toast.error('Please enter a valid email address'); return; }

    setSendingInvite(true);
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress: inviteEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send invitation');
      }
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      refreshAll();
    } catch (error: any) {
      const msg = error.message || 'Failed to send invitation';
      if (msg.includes('duplicate') || msg.includes('already')) {
        toast.error('This user is already a member or has a pending invitation');
      } else {
        toast.error(msg);
      }
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!organization) return;
    setRevokingInviteId(invitationId);
    try {
      const invitationsList = await organization.getInvitations();
      const invitation = invitationsList.data.find(inv => inv.id === invitationId);
      if (!invitation) { toast.error('Invitation not found'); return; }
      await invitation.revoke();
      toast.success('Invitation revoked successfully');
      refreshAll();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    } finally {
      setRevokingInviteId(null);
    }
  };

  // ── Role handlers ──────────────────────────────────────────────────

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (targetUserId === user?.id) { toast.error('You cannot change your own role'); return; }

    setUpdatingUserId(targetUserId);
    try {
      const res = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, role: newRole }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update role');
      }

      if (newRole === 'CARER') {
        toast.info('Role set to Carer. Click the pen icon to set up their profile.', { duration: 6000 });
      } else {
        toast.success('Role updated successfully');
      }
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // ── Species group handlers ─────────────────────────────────────────

  const handleAssignSpeciesGroup = async (userId: string, speciesGroupId: string) => {
    const member = people.find((p) => p.userId === userId);
    if (!member?.orgMemberId) return;

    try {
      const res = await fetch('/api/rbac/coordinator-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgMemberId: member.orgMemberId, speciesGroupId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign species group');
      }
      toast.success('Species group assigned');
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign species group');
    }
  };

  const handleRemoveSpeciesGroup = async (userId: string, speciesGroupId: string) => {
    const member = people.find((p) => p.userId === userId);
    if (!member?.orgMemberId) return;

    try {
      const res = await fetch('/api/rbac/coordinator-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgMemberId: member.orgMemberId, speciesGroupId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove species group');
      }
      toast.success('Species group removed');
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove species group');
    }
  };

  // ── Remove member handler ──────────────────────────────────────────

  const handleRemoveUser = async (userId: string) => {
    if (!organization) return;
    if (userId === user?.id) { toast.error('You cannot remove yourself from the organization'); return; }

    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      toast.success('User removed and deleted successfully');
      refreshAll();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove user');
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Edit profile handlers ─────────────────────────────────────────

  const openEditDialog = (carer: EnrichedCarer) => {
    setEditingCarer(carer);
    setEditPhone(carer.phone || '');
    setEditLicenseNumber(carer.licenseNumber || '');
    setEditJurisdiction(carer.jurisdiction || '');
    setEditSpecialtiesText((carer.specialties || []).join(', '));
    setEditNotes(carer.notes || '');
    setEditActive(carer.active);
    setEditStreetAddress(carer.streetAddress || '');
    setEditSuburb(carer.suburb || '');
    setEditState(carer.state || 'NSW');
    setEditPostcode(carer.postcode || '');
    setIsEditDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editingCarer) return;
    setSavingProfile(true);
    try {
      const specialties = editSpecialtiesText.split(',').map((s) => s.trim()).filter(Boolean);

      await apiJson(`/api/carers/${editingCarer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          phone: editPhone || null,
          licenseNumber: editLicenseNumber || null,
          jurisdiction: editJurisdiction || null,
          specialties,
          notes: editNotes || null,
          active: editActive,
          streetAddress: editStreetAddress || null,
          suburb: editSuburb || null,
          state: editState || null,
          postcode: editPostcode || null,
        }),
      });

      setEditingCarer(null);
      setIsEditDialogOpen(false);
      toast.success(`Profile for "${editingCarer.name}" updated.`);
      refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────

  const isAdmin = membership?.role === 'org:admin';
  const remainingSlots = MAX_USERS - people.length;

  const getRoleIcon = (role: string | null) => {
    switch (role) {
      case 'ADMIN': return <ShieldAlert className="h-3 w-3" />;
      case 'COORDINATOR': return <ShieldCheck className="h-3 w-3" />;
      default: return <Shield className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string | null): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'ADMIN': return 'default';
      case 'COORDINATOR': return 'secondary';
      default: return 'outline';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  if (!organization) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No organization found. Please ensure you&apos;re part of an organization.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Invite Section ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
          <CardDescription>
            Invite users to your organization by email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={sendingInvite || people.length >= MAX_USERS}
                />
                <Button type="submit" disabled={sendingInvite || people.length >= MAX_USERS}>
                  {sendingInvite ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {people.length} / {MAX_USERS} users
              </span>
              {remainingSlots > 0 && remainingSlots <= 5 && (
                <span className="text-amber-600">
                  {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Pending Invitations ─────────────────────────────────────── */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {invitation.emailAddress}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={revokingInviteId === invitation.id}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke the invitation sent to {invitation.emailAddress}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevokeInvitation(invitation.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke Invitation
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Roles Info Alert ────────────────────────────────────────── */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900">WildTrack360 Roles</AlertTitle>
        <AlertDescription className="text-blue-800">
          <div className="mt-2 space-y-1 text-sm">
            <p><strong>Admin</strong> &mdash; Full control. Manages users, species groups, org settings, and can see all animals.</p>
            <p><strong>Coordinator</strong> &mdash; Manages animals within their assigned species groups. Can assign animals to carers and view carer workloads.</p>
            <p><strong>Carer</strong> &mdash; Can only see and update animals assigned to them.</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* ── Unified Members Table ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organisation Members
          </CardTitle>
          <CardDescription>
            Manage roles, species group assignments, and profiles for all members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading members...
            </div>
          ) : people.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found in this organization.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Species Groups</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((member) => {
                  const isCurrentUser = member.userId === user?.id;

                  return (
                    <TableRow key={member.clerkMembershipId}>
                      {/* Name + avatar */}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.imageUrl && (
                            <img src={member.imageUrl} alt="" className="h-8 w-8 rounded-full" />
                          )}
                          <span>
                            {member.firstName || ''} {member.lastName || ''}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-sm text-muted-foreground">
                        {member.email}
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        {isCurrentUser ? (
                          member.role ? (
                            <Badge variant={getRoleBadgeVariant(member.role)}>
                              <span className="flex items-center gap-1">
                                {getRoleIcon(member.role)}
                                {member.role}
                              </span>
                            </Badge>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium">No role assigned</span>
                          )
                        ) : (
                          <Select
                            value={member.role ?? ''}
                            onValueChange={(value) => handleRoleChange(member.userId, value)}
                            disabled={updatingUserId === member.userId}
                          >
                            <SelectTrigger className="w-[170px] h-8">
                              <SelectValue placeholder="Assign a role..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">
                                <span className="flex items-center gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  Admin
                                </span>
                              </SelectItem>
                              <SelectItem value="COORDINATOR">
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Coordinator
                                </span>
                              </SelectItem>
                              <SelectItem value="CARER">
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Carer
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Species Groups */}
                      <TableCell>
                        {(member.role === 'COORDINATOR' || member.role === 'CARER') && member.orgMemberId ? (
                          <SpeciesGroupBadges
                            userId={member.userId}
                            assignments={member.speciesAssignments}
                            speciesGroups={speciesGroups}
                            isCurrentUser={isCurrentUser}
                            onAssign={handleAssignSpeciesGroup}
                            onRemove={handleRemoveSpeciesGroup}
                          />
                        ) : !member.role ? (
                          <span className="text-xs text-muted-foreground">Assign a role first</span>
                        ) : member.role === 'ADMIN' ? (
                          <span className="text-xs text-muted-foreground">All species (admin)</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>

                      {/* Profile status */}
                      <TableCell>
                        {member.carerProfile ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            member.hasProfile ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {member.hasProfile ? 'Complete' : 'Incomplete'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Profile button — show if there's a carer profile record */}
                          {member.carerProfile && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(member.carerProfile!)}
                              title="Edit Profile"
                            >
                              <Pen className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Remove button — not for current user */}
                          {!isCurrentUser && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={deletingUserId === member.userId}
                                  title="Remove from organization"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.firstName || member.email} from the organization? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveUser(member.userId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          {isCurrentUser && (
                            <span className="text-xs text-muted-foreground px-2">You</span>
                          )}
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

      {/* ── Edit Profile Dialog ─────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Carer Profile</DialogTitle>
            <DialogDescription>
              Update profile details for {editingCarer?.name}. Name and email are managed via Clerk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editingCarer?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingCarer?.email || ''} disabled />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" placeholder="Phone (optional)" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-license">License Number</Label>
                <Input id="edit-license" placeholder="License Number (optional)" value={editLicenseNumber} onChange={(e) => setEditLicenseNumber(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-jurisdiction">Jurisdiction</Label>
              <Input id="edit-jurisdiction" placeholder="Jurisdiction (optional)" value={editJurisdiction} onChange={(e) => setEditJurisdiction(e.target.value)} />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Address Details (Required for NSW Reporting)</h4>
              <div className="space-y-2">
                <Label htmlFor="edit-street">Street Address</Label>
                <Input id="edit-street" placeholder="e.g., 123 Main Street" value={editStreetAddress} onChange={(e) => setEditStreetAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-suburb">Suburb/Town</Label>
                  <Input id="edit-suburb" placeholder="e.g., Sydney" value={editSuburb} onChange={(e) => setEditSuburb(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-postcode">Postcode</Label>
                  <Input id="edit-postcode" placeholder="e.g., 2000" value={editPostcode} onChange={(e) => setEditPostcode(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-specialties">Specialties (comma-separated)</Label>
              <Textarea id="edit-specialties" placeholder="e.g. Raptors, Marsupials" value={editSpecialtiesText} onChange={(e) => setEditSpecialtiesText(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea id="edit-notes" placeholder="Additional notes (optional)" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={editActive} onCheckedChange={setEditActive} id="edit-carer-active" />
              <Label htmlFor="edit-carer-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={savingProfile}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              <Save className="mr-2 h-4 w-4" />
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
