'use client';

// WildTrack360 does not (yet) render a dynamic breadcrumb trail the way RangerOS
// did. Community pages call useSetBreadcrumbLabel to publish a human label for
// the current record; here it is a safe no-op so those pages port unchanged. If
// a breadcrumb system is added later, wire it in here without touching callers.
export function useSetBreadcrumbLabel(_label?: string | null): void {
  // intentionally empty
}
