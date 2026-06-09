import type { ReactNode } from 'react';

// Self-contained branded wrapper for the public (no-login) donate / join pages.
// Cream page, green WildTrack360 header, centred white card — matches the
// receipt-email brand.
export function PublicShell({
  orgName,
  title,
  subtitle,
  children,
}: {
  orgName?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f5db] flex items-center justify-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-lg">
        <div className="bg-gradient-to-br from-[#3e6f4f] to-[#2d5a3d] px-6 py-6 text-center text-white">
          {orgName ? <div className="text-lg font-semibold">{orgName}</div> : <div className="text-lg font-semibold">WildTrack360</div>}
          <div className="text-xs opacity-80 mt-0.5">Powered by WildTrack360</div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground mt-1">{subtitle}</p> : null}
          </div>
          {children}
        </div>
        <div className="px-6 pb-5 text-center text-[11px] text-muted-foreground">Secured by Square</div>
      </div>
    </div>
  );
}
