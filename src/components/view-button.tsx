'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';

interface ViewButtonProps {
  href: string;
  label?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'default' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export function ViewButton({
  href,
  label = 'View',
  size = 'sm',
  variant = 'outline',
}: ViewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button variant={variant} size={size} asChild>
      <Link
        href={href}
        aria-disabled={isLoading}
        tabIndex={isLoading ? -1 : undefined}
        style={isLoading ? { pointerEvents: 'none' } : undefined}
        onClick={(event) => {
          if (isLoading) {
            event.preventDefault();
            return;
          }
          setIsLoading(true);
        }}
        onKeyDown={(event) => {
          if (isLoading && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
          }
        }}
      >
        {isLoading ? (
          <>
            <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full inline-block mr-1"></span>
            Loading...
          </>
        ) : (
          label
        )}
      </Link>
    </Button>
  );
}
