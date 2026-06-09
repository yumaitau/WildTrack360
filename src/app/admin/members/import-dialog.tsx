'use client';

import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface RowResult {
  row: number;
  email?: string;
  status: 'created' | 'skipped' | 'failed';
  reason?: string;
}

interface ImportResponse {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  results: RowResult[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportDialog({ open, onOpenChange, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  function reset() {
    setFile(null);
    setResult(null);
  }

  async function handleImport() {
    if (!file) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/members/import', { method: 'POST', body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || res.statusText);
      }
      const data: ImportResponse = await res.json();
      setResult(data);
      toast.success(`Imported ${data.created} of ${data.total} members`);
      onImported();
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import members from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with one member per row. Existing members (matched by email) are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
            <p className="font-medium">Required columns: <code>email</code>, <code>firstName</code>, <code>lastName</code></p>
            <p className="text-muted-foreground">
              Optional: phone, addressLine1, addressLine2, suburb, state, postcode, country,
              memberNumber, status (ACTIVE/LAPSED/CANCELLED/DECEASED), joinedAt (YYYY-MM-DD).
              Custom fields use <code>custom:fieldKey</code> column headers.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/members/import/sample"
              className="inline-flex items-center gap-1.5 text-primary hover:underline"
            >
              <Download className="h-4 w-4" /> Download example CSV
            </a>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">CSV file</label>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {result && (
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div className="font-medium">
                {result.created} created · {result.skipped} skipped · {result.failed} failed
                {' '}(of {result.total})
              </div>
              {result.results.some((r) => r.status !== 'created') && (
                <div className="max-h-48 overflow-y-auto text-xs space-y-1 border-t pt-2">
                  {result.results
                    .filter((r) => r.status !== 'created')
                    .map((r) => (
                      <div key={r.row} className="font-mono">
                        Row {r.row}{r.email ? ` (${r.email})` : ''}: {r.status}
                        {r.reason ? ` — ${r.reason}` : ''}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleImport} disabled={!file || submitting}>
            <Upload className="h-4 w-4 mr-2" />
            {submitting ? 'Importing…' : 'Import CSV'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
