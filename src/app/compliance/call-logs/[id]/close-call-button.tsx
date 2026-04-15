'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

export function CloseCallButton({ callLogId }: { callLogId: string }) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    setClosing(true);
    try {
      const res = await fetch(`/api/call-logs/${callLogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to close call');
      }

      router.refresh();
    } catch {
      setClosing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="sm:h-9 sm:px-4"
      onClick={handleClose}
      disabled={closing}
    >
      {closing ? (
        <Loader2 className="animate-spin h-4 w-4 mr-2" />
      ) : (
        <CheckCircle className="h-4 w-4 mr-2" />
      )}
      Close Call
    </Button>
  );
}
