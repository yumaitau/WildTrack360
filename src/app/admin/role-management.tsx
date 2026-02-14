"use client";

import { useState, useEffect } from 'react';
import { useOrganization, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, ShieldCheck, ShieldAlert, Users, Info, Leaf } from 'lucide-react';
import { toast } from 'sonner';
import type { OrgMemberWithAssignments } from '@/lib/types';

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
}

export function RoleManagement() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [clerkMembers, setClerkMembers] = useState<ClerkMember[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMemberWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!organization) return;
    setLoading(true);
    try {
      // Fetch Clerk members for identity info
      const membersList = await organization.getMemberships();
      setClerkMembers(membersList.data as unknown as ClerkMember[]);

      // Fetch WildTrack360 RBAC roles
      const res = await fetch('/api/rbac/roles');
      if (res.ok) {
        const data = await res.json();
        setOrgMembers(data);
      }
    } catch (error) {
      console.error('Error fetching role data:', error);
      toast.error('Failed to load role data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!organization) return;
    fetchData();
  }, [organization?.id]);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    if (targetUserId === user?.id) {
      toast.error('You cannot change your own role');
      return;
    }

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

      toast.success('Role updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleForUser = (userId: string): string => {
    const member = orgMembers.find((m) => m.userId === userId);
    return member?.role ?? 'CARER';
  };

  const getSpeciesAssignments = (userId: string) => {
    const member = orgMembers.find((m) => m.userId === userId);
    return member?.speciesAssignments ?? [];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <ShieldAlert className="h-3 w-3" />;
      case 'COORDINATOR':
        return <ShieldCheck className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case 'ADMIN':
        return 'default';
      case 'COORDINATOR':
        return 'secondary';
      default:
        return 'outline';
    }
  };

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role Assignments
          </CardTitle>
          <CardDescription>
            Assign WildTrack360 roles to organisation members. These roles control what each person can see and do.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading members...
            </div>
          ) : clerkMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found in this organization.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>WildTrack360 Role</TableHead>
                  <TableHead>Species Groups</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clerkMembers.map((member) => {
                  const userId = member.publicUserData.userId;
                  const isCurrentUser = userId === user?.id;
                  const currentRole = getRoleForUser(userId);
                  const assignments = getSpeciesAssignments(userId);

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
                            {member.publicUserData.firstName || ''}{' '}
                            {member.publicUserData.lastName || ''}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (You)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {member.publicUserData.identifier}
                      </TableCell>
                      <TableCell>
                        {isCurrentUser ? (
                          <Badge variant={getRoleBadgeVariant(currentRole)}>
                            <span className="flex items-center gap-1">
                              {getRoleIcon(currentRole)}
                              {currentRole}
                            </span>
                          </Badge>
                        ) : (
                          <Select
                            value={currentRole}
                            onValueChange={(value) =>
                              handleRoleChange(userId, value)
                            }
                            disabled={updatingUserId === userId}
                          >
                            <SelectTrigger className="w-[150px] h-8">
                              <SelectValue />
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
                      <TableCell>
                        {currentRole === 'COORDINATOR' && assignments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignments.map((a) => (
                              <Badge key={a.id} variant="outline" className="text-xs">
                                <Leaf className="h-3 w-3 mr-1" />
                                {a.speciesGroup.name}
                              </Badge>
                            ))}
                          </div>
                        ) : currentRole === 'COORDINATOR' ? (
                          <span className="text-xs text-muted-foreground">
                            No species groups assigned
                          </span>
                        ) : currentRole === 'ADMIN' ? (
                          <span className="text-xs text-muted-foreground">
                            All species (admin)
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
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
    </div>
  );
}
