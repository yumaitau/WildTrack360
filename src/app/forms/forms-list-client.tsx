'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, FileText, Pencil, Plus, Table2, Trash2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
} from '@/components/ui/alert-dialog';
import {
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  readApiError,
  type CustomFormRecord,
} from '@/components/forms/custom-form-types';

interface Props {
  canManage: boolean;
  canViewSubmissions: boolean;
}

export function FormsListClient({ canManage, canViewSubmissions }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState<CustomFormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CustomFormRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-forms');
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to load forms'));
      const body = (await res.json()) as { forms: CustomFormRecord[] };
      setForms(body.forms ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/custom-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to create form'));
      const form = (await res.json()) as CustomFormRecord;
      toast.success('Form created');
      setCreateOpen(false);
      router.push(`/forms/${form.id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create form');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/custom-forms/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readApiError(res, 'Failed to delete form'));
      toast.success('Form deleted');
      setDeleteTarget(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete form');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-sm text-muted-foreground">
            Custom field-observation forms for your organisation.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New form
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No forms yet</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? 'Create a form to start collecting observations.'
                  : 'No published forms are available yet. Check back later.'}
              </p>
            </div>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New form
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{form.title}</p>
                    {form.description ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {form.description}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE_CLASSES[form.status]}>
                    {STATUS_LABELS[form.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  v{form.currentVersion} · Updated {new Date(form.updatedAt).toLocaleString()}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  {form.status === 'published' && (
                    <Button asChild size="sm">
                      <Link href={`/forms/${form.id}/fill`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Fill
                      </Link>
                    </Button>
                  )}
                  {canManage && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/forms/${form.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  )}
                  {canViewSubmissions && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/forms/${form.id}/submissions`}>
                        <Table2 className="mr-2 h-4 w-4" />
                        Submissions
                      </Link>
                    </Button>
                  )}
                  {canManage && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(form)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New form</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-form-title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="new-form-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Koala sighting survey"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-form-description">Description</Label>
              <Textarea
                id="new-form-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="What this form captures."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create form'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the form, its version history, and all submissions. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete form'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
