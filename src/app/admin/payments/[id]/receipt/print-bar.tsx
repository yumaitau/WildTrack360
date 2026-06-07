'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="no-print mx-auto max-w-2xl mb-4 flex items-center justify-between">
      <Link href={backHref}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
      </Link>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
      </Button>
    </div>
  );
}
