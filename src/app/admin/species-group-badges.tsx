"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Leaf, X, Plus, Loader2 } from 'lucide-react';
import type { OrgMemberWithAssignments, SpeciesGroupWithCoordinators } from '@/lib/types';

export function SpeciesGroupBadges({
  userId,
  assignments,
  speciesGroups,
  isCurrentUser,
  onAssign,
  onRemove,
}: {
  userId: string;
  assignments: OrgMemberWithAssignments['speciesAssignments'];
  speciesGroups: SpeciesGroupWithCoordinators[];
  isCurrentUser: boolean;
  onAssign: (userId: string, groupId: string) => Promise<void>;
  onRemove: (userId: string, groupId: string) => Promise<void>;
}) {
  const [busyGroupId, setBusyGroupId] = useState<string | null>(null);
  const assignedGroupIds = new Set(assignments.map((a) => a.speciesGroupId));

  const handleToggle = async (groupId: string, assigned: boolean) => {
    setBusyGroupId(groupId);
    try {
      if (assigned) {
        await onRemove(userId, groupId);
      } else {
        await onAssign(userId, groupId);
      }
    } finally {
      setBusyGroupId(null);
    }
  };

  if (speciesGroups.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No species groups defined
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {speciesGroups.map((g) => {
        const assigned = assignedGroupIds.has(g.id);
        const isBusy = busyGroupId === g.id;

        if (isCurrentUser) {
          return assigned ? (
            <Badge key={g.id} variant="secondary" className="text-xs">
              <Leaf className="h-3 w-3 mr-1" />
              {g.name}
            </Badge>
          ) : null;
        }

        return (
          <button
            key={g.id}
            disabled={isBusy}
            onClick={() => handleToggle(g.id, assigned)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
              ${assigned
                ? 'bg-primary/10 text-primary border border-primary/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
                : 'bg-muted/50 text-muted-foreground border border-dashed border-muted-foreground/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
              }
              ${isBusy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            `}
          >
            {isBusy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : assigned ? (
              <X className="h-3 w-3" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {g.name}
          </button>
        );
      })}
    </div>
  );
}
