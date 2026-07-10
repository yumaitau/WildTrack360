'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Megaphone, Plus, Send, Pencil, Trash2, EyeOff } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NewsPost {
  id: string;
  title: string;
  body: string;
  status: 'DRAFT' | 'PUBLISHED';
  authorName: string | null;
  publishedAt: string | null;
  emailSentAt: string | null;
  recipientCount: number | null;
  createdAt: string;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function NewsAdmin() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPosts(await apiJson<NewsPost[]>('/api/news'));
    } catch (err) {
      toast.error(`Failed to load posts: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openNew() {
    setEditing(null);
    setTitle('');
    setBody('');
    setEditorOpen(true);
  }

  function openEdit(p: NewsPost) {
    setEditing(p);
    setTitle(p.title);
    setBody(p.body);
    setEditorOpen(true);
  }

  async function save() {
    if (!title.trim()) return toast.error('Enter a title');
    if (!body.trim()) return toast.error('Enter the post body');
    setSaving(true);
    try {
      if (editing) {
        await apiJson(`/api/news/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ title, body }),
        });
        toast.success('Post updated');
      } else {
        await apiJson('/api/news', { method: 'POST', body: JSON.stringify({ title, body }) });
        toast.success('Draft saved');
      }
      setEditorOpen(false);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function publish(p: NewsPost) {
    const first = !p.emailSentAt;
    if (
      first &&
      !confirm('Publish this post to the member portal and email it to all active members?')
    )
      return;
    setPublishing(p.id);
    try {
      const res = await apiJson<{ emailed: number }>(`/api/news/${p.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ sendEmail: first }),
      });
      toast.success(
        first
          ? `Published · emailed ${res.emailed} member${res.emailed === 1 ? '' : 's'}`
          : 'Published'
      );
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPublishing(null);
    }
  }

  async function unpublish(p: NewsPost) {
    setPublishing(p.id);
    try {
      await apiJson(`/api/news/${p.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ unpublish: true }),
      });
      toast.success('Moved back to draft');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPublishing(null);
    }
  }

  async function remove(p: NewsPost) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await apiJson(`/api/news/${p.id}`, { method: 'DELETE' });
      toast.success('Post deleted');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> News &amp; announcements
          </h1>
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Member updates</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Publish news to the member portal. When you publish, every active member is emailed.
              </p>
            </div>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> New post
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading…</p>
            ) : posts.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No posts yet. Create your first update to share with members.
              </p>
            ) : (
              posts.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{p.title}</span>
                      <Badge
                        variant="outline"
                        className={
                          p.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-200'
                            : 'bg-amber-500/10 text-amber-700 border-amber-200'
                        }
                      >
                        {p.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                      {p.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {p.authorName ? `By ${p.authorName} · ` : ''}
                      {p.publishedAt
                        ? `Published ${new Date(p.publishedAt).toLocaleDateString('en-AU')}`
                        : `Created ${new Date(p.createdAt).toLocaleDateString('en-AU')}`}
                      {p.emailSentAt && p.recipientCount != null
                        ? ` · emailed ${p.recipientCount} member${p.recipientCount === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {p.status === 'PUBLISHED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={publishing === p.id}
                        onClick={() => unpublish(p)}
                      >
                        <EyeOff className="h-4 w-4 mr-1" /> Unpublish
                      </Button>
                    ) : (
                      <Button size="sm" disabled={publishing === p.id} onClick={() => publish(p)}>
                        <Send className="h-4 w-4 mr-1" />
                        {publishing === p.id
                          ? 'Publishing…'
                          : p.emailSentAt
                            ? 'Publish'
                            : 'Publish & email'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete post ${p.title}`}
                      onClick={() => remove(p)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit post' : 'New post'}</DialogTitle>
            <DialogDescription>
              Drafts stay private until you publish. Editing a published post does not re-send the
              email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="news-title">Title</Label>
              <Input
                id="news-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Spring rescue update"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="news-body">Body</Label>
              <Textarea
                id="news-body"
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share what's happening at your organisation…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
