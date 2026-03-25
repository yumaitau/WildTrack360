"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Home, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import Link from "next/link";
import { useOrganization } from '@clerk/nextjs';
import { useToast } from "@/hooks/use-toast";

interface LookupItem {
  id: string;
  label: string;
  displayOrder: number;
  active: boolean;
  clerkOrganizationId: string;
}

const LOOKUP_TYPES = [
  { key: 'reason', title: 'Reasons', description: 'Why the caller is contacting (e.g. injured animal, orphaned joey, snake removal)' },
  { key: 'referrer', title: 'Referrers', description: 'How the call came in (e.g. member of public, council, RSPCA, another carer)' },
  { key: 'action', title: 'Actions', description: 'What was done (e.g. dispatched rescuer, gave advice, referred to vet)' },
  { key: 'outcome', title: 'Outcomes', description: 'End result (e.g. animal collected, caller assisted, no action required)' },
] as const;

type LookupType = typeof LOOKUP_TYPES[number]['key'];

export default function CallLogLookupsPage() {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [lookups, setLookups] = useState<Record<LookupType, LookupItem[]>>({
    reason: [], referrer: [], action: [], outcome: [],
  });
  const [newLabels, setNewLabels] = useState<Record<LookupType, string>>({
    reason: '', referrer: '', action: '', outcome: '',
  });
  const [loading, setLoading] = useState(true);

  const loadLookups = useCallback(async () => {
    if (!organization) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/call-log-lookups?orgId=${organization.id}`);
      if (!res.ok) throw new Error('Failed to fetch lookups');
      const data = await res.json();
      setLookups(data);
    } catch (error) {
      console.error('Error loading lookups:', error);
    } finally {
      setLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const handleAdd = async (type: LookupType) => {
    const label = newLabels[type].trim();
    if (!label || !organization) return;

    try {
      const res = await fetch('/api/call-log-lookups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          label,
          displayOrder: (lookups[type]?.length || 0),
          clerkOrganizationId: organization.id,
        }),
      });

      if (res.ok) {
        setNewLabels((prev) => ({ ...prev, [type]: '' }));
        await loadLookups();
        toast({ title: "Added", description: `"${label}" added successfully` });
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add item", variant: "destructive" });
    }
  };

  const handleToggle = async (type: LookupType, item: LookupItem) => {
    if (!organization) return;
    try {
      const res = await fetch('/api/call-log-lookups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          id: item.id,
          active: !item.active,
          clerkOrganizationId: organization.id,
        }),
      });

      if (res.ok) {
        await loadLookups();
      } else {
        throw new Error('Failed to toggle');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    }
  };

  const handleDelete = async (type: LookupType, item: LookupItem) => {
    if (!organization) return;
    try {
      const res = await fetch(`/api/call-log-lookups?type=${type}&id=${item.id}&orgId=${organization.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadLookups();
        toast({ title: "Deleted", description: `"${item.label}" removed` });
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete item", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/compliance/call-logs">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Back to call logs">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="icon" className="shrink-0" aria-label="Home">
            <Home className="h-4 w-4" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Call Log Lookup Lists</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure the dropdown options for your organisation&apos;s call logs
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : (
        <Tabs defaultValue="reason">
          <TabsList className="grid w-full grid-cols-4">
            {LOOKUP_TYPES.map((lt) => (
              <TabsTrigger key={lt.key} value={lt.key}>
                {lt.title}
                {lookups[lt.key]?.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{lookups[lt.key].length}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {LOOKUP_TYPES.map((lt) => (
            <TabsContent key={lt.key} value={lt.key}>
              <Card>
                <CardHeader>
                  <CardTitle>{lt.title}</CardTitle>
                  <CardDescription>{lt.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new item */}
                  <div className="flex gap-2">
                    <Input
                      placeholder={`Add new ${lt.key}...`}
                      value={newLabels[lt.key]}
                      onChange={(e) => setNewLabels((prev) => ({ ...prev, [lt.key]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd(lt.key))}
                    />
                    <Button onClick={() => handleAdd(lt.key)} disabled={!newLabels[lt.key].trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>

                  {/* List items */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Label</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lookups[lt.key]?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell>
                            <Badge variant={item.active ? 'secondary' : 'outline'} className="text-xs">
                              {item.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggle(lt.key, item)}
                                title={item.active ? 'Deactivate' : 'Activate'}
                                aria-label={item.active ? `Deactivate ${item.label}` : `Activate ${item.label}`}
                              >
                                {item.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(lt.key, item)}
                                className="text-destructive hover:text-destructive"
                                title="Delete"
                                aria-label={`Delete ${item.label}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!lookups[lt.key] || lookups[lt.key].length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No items yet. Add your first {lt.key} above.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
