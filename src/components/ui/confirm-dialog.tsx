'use client';

import * as React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonProps['variant'];
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirm() {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    []
  );

  function settle(value: boolean) {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }

  const dialog = (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pending?.title}</DialogTitle>
          {pending?.description && <DialogDescription>{pending.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => settle(false)}>
            {pending?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={pending?.variant ?? 'destructive'} onClick={() => settle(true)}>
            {pending?.confirmLabel ?? 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
}
