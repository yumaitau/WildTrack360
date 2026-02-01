"use client";

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Trash2, Mail, AlertCircle, Users, Shield, ShieldCheck, Info, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_USERS = 25;

interface OrganizationMember {
  id: string;
  publicUserData: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string;
    identifier: string;
  };
  publicMetadata: {
    [key: string]: any;
  };
  role: string;
  createdAt: string;
}

interface OrganizationInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: string;
  publicMetadata?: {
    [key: string]: any;
  };
}

export function UserManagement() {
  const { organization, membership } = useOrganization();
  const { user } = useUser();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<OrganizationInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  const fetchMembers = async () => {
    if (!organization) return;
    
    setLoadingMembers(true);
    try {
      const membersList = await organization.getMemberships();
      setMembers(membersList.data as unknown as OrganizationMember[]);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load organization members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInvitations = async () => {
    if (!organization) return;
    
    setLoadingInvitations(true);
    try {
      const invitationsList = await organization.getInvitations();
      setPendingInvitations(invitationsList.data.filter(inv => inv.status === 'pending') as unknown as OrganizationInvitation[]);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load pending invitations');
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (!organization) return;
    
    fetchMembers();
    fetchInvitations();
  }, [organization?.id]);

  const getUserEmailDomain = () => {
    const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress;
    if (!currentUserEmail) return null;
    return currentUserEmail.split('@')[1];
  };

  const validateEmailDomain = (email: string) => {
    const domain = getUserEmailDomain();
    if (!domain) return false;
    return email.endsWith(`@${domain}`);
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organization) {
      toast.error('No organization found');
      return;
    }

    if (!inviteEmail) {
      toast.error('Please enter an email address');
      return;
    }

    if (members.length >= MAX_USERS) {
      toast.error(`Maximum of ${MAX_USERS} users per organization reached`);
      return;
    }

    if (!validateEmailDomain(inviteEmail)) {
      const domain = getUserEmailDomain();
      toast.error(`Email must be from your organization domain (@${domain})`);
      return;
    }

    setSendingInvite(true);
    try {
      await organization.inviteMember({
        emailAddress: inviteEmail,
        role: 'org:member',
      });
      
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      fetchMembers();
      fetchInvitations();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      if (error.errors?.[0]?.code === 'duplicate_record') {
        toast.error('This user is already a member or has a pending invitation');
      } else {
        toast.error(error.errors?.[0]?.message || 'Failed to send invitation');
      }
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!organization) return;
    
    if (userId === user?.id) {
      toast.error('You cannot change your own role');
      return;
    }

    setUpdatingRoleUserId(userId);
    try {
      const memberToUpdate = members.find(m => m.publicUserData.userId === userId);
      if (!memberToUpdate) {
        toast.error('Member not found');
        return;
      }

      await organization.updateMember({
        userId,
        role: newRole
      });
      
      toast.success(`Role updated successfully`);
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!organization) return;
    
    setRevokingInviteId(invitationId);
    try {
      // Get fresh invitations list and find the specific invitation
      const invitationsList = await organization.getInvitations();
      const invitation = invitationsList.data.find(inv => inv.id === invitationId);
      
      if (!invitation) {
        toast.error('Invitation not found');
        return;
      }
      
      // Call the revoke method on the invitation object
      await invitation.revoke();
      
      toast.success('Invitation revoked successfully');
      fetchInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
      toast.error('Failed to revoke invitation');
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!organization) return;
    
    if (userId === user?.id) {
      toast.error('You cannot remove yourself from the organization');
      return;
    }

    setDeletingUserId(userId);
    try {
      const memberToRemove = members.find(m => m.publicUserData.userId === userId);
      if (!memberToRemove) {
        toast.error('Member not found');
        return;
      }

      await organization.removeMember(userId);
      toast.success('User removed from organization');
      fetchMembers();
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error('Failed to remove user from organization');
    } finally {
      setDeletingUserId(null);
    }
  };

  const isAdmin = membership?.role === 'org:admin';
  const emailDomain = getUserEmailDomain();
  const remainingSlots = MAX_USERS - members.length;

  if (!organization) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No organization found. Please ensure you&apos;re part of an organization.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Limited Permissions</AlertTitle>
          <AlertDescription className="text-blue-800">
            As a member, you can view organization users but cannot invite new users, change roles, or remove users.
            Contact an admin if you need to make changes.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? `Invite users from your organization domain (${emailDomain ? `@${emailDomain}` : 'your domain'})`
              : 'Only admins can invite new users to the organization'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder={`user@${emailDomain || 'yourdomain.com'}`}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={!isAdmin || sendingInvite || members.length >= MAX_USERS}
                />
                <Button 
                  type="submit" 
                  disabled={!isAdmin || sendingInvite || members.length >= MAX_USERS}
                >
                  {sendingInvite ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {members.length} / {MAX_USERS} users
              </span>
              {remainingSlots > 0 && remainingSlots <= 5 && (
                <span className="text-amber-600">
                  {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining
                </span>
              )}
            </div>

            {members.length >= MAX_USERS && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Your organization has reached the maximum of {MAX_USERS} users.
                </AlertDescription>
              </Alert>
            )}

            {!isAdmin && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Only organization admins can invite new users.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members
          </CardTitle>
          <CardDescription>
            {isAdmin 
              ? 'View and manage users in your organization'
              : 'View users in your organization (admin access required for management)'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading members...
            </div>
          ) : members.length === 0 ? (
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
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.publicUserData.userId === user?.id;
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.publicUserData.imageUrl && (
                            <img
                              src={member.publicUserData.imageUrl}
                              alt=""
                              className="h-8 w-8 rounded-full"
                            />
                          )}
                          <span>
                            {member.publicUserData.firstName || ''} {member.publicUserData.lastName || ''}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {member.publicUserData.identifier}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdmin && !isCurrentUser ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => handleRoleChange(member.publicUserData.userId, value)}
                            disabled={updatingRoleUserId === member.publicUserData.userId}
                          >
                            <SelectTrigger className="w-[110px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="org:admin">
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Admin
                                </span>
                              </SelectItem>
                              <SelectItem value="org:member">
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  Member
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium">
                            {member.role === 'org:admin' ? (
                              <><ShieldCheck className="h-3 w-3" /> Admin</>
                            ) : (
                              <><Shield className="h-3 w-3" /> Member</>
                            )}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(member.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && !isCurrentUser ? (
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={deletingUserId === member.publicUserData.userId}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.publicUserData.firstName || member.publicUserData.identifier} from the organization? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveUser(member.publicUserData.userId)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {isCurrentUser ? 'Current user' : 'Admin only'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(pendingInvitations.length > 0 || loadingInvitations) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? 'Manage pending invitations sent to users'
                : 'View pending invitations (admin access required for management)'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInvitations ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invitations...
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending invitations.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
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
                      <TableCell>
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                          {invitation.role === 'org:admin' ? (
                            <><ShieldCheck className="h-3 w-3" /> Admin</>
                          ) : (
                            <><Shield className="h-3 w-3" /> Member</>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(invitation.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={revokingInviteId === invitation.id}
                              >
                                <X className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to revoke the invitation sent to {invitation.emailAddress}? They will no longer be able to join the organization with this invitation.
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
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Admin only
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}