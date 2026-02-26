"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const [hasInvite, setHasInvite] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Only allow sign-up if there's an invitation ticket in the URL
    // (either in query params directly or encoded in redirect_url)
    const fullUrl = window.location.href;
    const hasTicket =
      fullUrl.includes("__clerk_ticket") ||
      fullUrl.includes("__clerk_ticket%3D");

    setHasInvite(hasTicket);
    setChecked(true);

    if (!hasTicket) {
      window.location.href = "/sign-in";
    }
  }, [searchParams]);

  if (!checked || !hasInvite) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SignUp />
    </div>
  );
}
