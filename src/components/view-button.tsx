"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

interface ViewButtonProps {
  href: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "default" | "secondary" | "ghost" | "link" | "destructive";
}

export function ViewButton({ href, label = "View", size = "sm", variant = "outline" }: ViewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Link href={href}>
      <Button 
        variant={variant}
        size={size}
        onClick={() => setIsLoading(true)}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full inline-block mr-1"></span>
            Loading...
          </>
        ) : (
          label
        )}
      </Button>
    </Link>
  );
}