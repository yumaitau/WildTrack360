'use client';

import { useEffect } from 'react';

interface AutoPrintProps {
  autoPrint: boolean;
}

/**
 * Renders the print/close controls for the specimen label page and, when
 * opened with ?print=1 (typically via "Print label" on the register list),
 * fires window.print() once on mount so the carer lands straight on the
 * OS print dialog without an extra click.
 */
export default function PrintControls({ autoPrint }: AutoPrintProps) {
  useEffect(() => {
    if (!autoPrint) return;
    // requestAnimationFrame defers the print call past the initial paint so
    // the label is fully rendered before the browser freezes to snapshot it.
    const id = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(id);
  }, [autoPrint]);

  return (
    <div className="flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
      >
        Print
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"
      >
        Close
      </button>
    </div>
  );
}
