'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { FormTemplateBuilder } from '@/components/forms/form-template-builder';
import type { FormField } from '@/lib/forms/form-templates';

interface TemplateResponse {
  id?: string;
  name: string | null;
  fields: FormField[];
}

export function FieldsAdmin() {
  const [initial, setInitial] = useState<{ name: string; fields: FormField[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/form-templates/MEMBER');
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as TemplateResponse;
        setInitial({
          name: data.name ?? 'Member profile',
          fields: data.fields ?? [],
        });
      } catch (err) {
        toast.error(`Failed to load template: ${(err as Error).message}`);
        setInitial({ name: 'Member profile', fields: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(payload: { name: string; fields: FormField[] }) {
    try {
      const res = await fetch('/api/form-templates/MEMBER', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Save failed');
      }
      const saved = (await res.json()) as TemplateResponse;
      setInitial({ name: saved.name ?? payload.name, fields: saved.fields });
      toast.success('Template saved');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Settings2 className="h-6 w-6" /> Member custom fields
          </h1>
          <Link href="/admin/members">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Members
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {loading || !initial ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <FormTemplateBuilder initial={initial} onSave={handleSave} entityLabel="Member" />
        )}
      </main>
    </div>
  );
}
