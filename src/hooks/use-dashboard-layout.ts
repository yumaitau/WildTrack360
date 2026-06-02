'use client';

// Dashboard layout state: widget order, visibility, and size, persisted to
// localStorage per browser. New widgets registered by the app are appended;
// widgets no longer registered are dropped. The stored layout is merged with
// the current registration so the UI never references a stale widget.

import { useCallback, useEffect, useState } from 'react';

export type WidgetSize = 'half' | 'full';

export interface WidgetRegistration {
  id: string;
  defaultSize?: WidgetSize;
}

export interface WidgetLayoutItem {
  id: string;
  hidden: boolean;
  size: WidgetSize;
}

const STORAGE_PREFIX = 'wildtrack360:dashboard-layout:v1';

function buildDefault(widgets: WidgetRegistration[]): WidgetLayoutItem[] {
  return widgets.map((w) => ({ id: w.id, hidden: false, size: w.defaultSize ?? 'full' }));
}

/**
 * Merge a persisted layout with the currently registered widgets:
 *   - keep stored order/visibility/size for widgets that still exist
 *   - append newly registered widgets (in registration order)
 *   - drop stored entries whose widget no longer exists
 */
function reconcile(stored: WidgetLayoutItem[], widgets: WidgetRegistration[]): WidgetLayoutItem[] {
  const registered = new Map(widgets.map((w) => [w.id, w]));
  const seen = new Set<string>();
  const merged: WidgetLayoutItem[] = [];

  for (const item of stored) {
    const reg = registered.get(item.id);
    if (!reg || seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push({
      id: item.id,
      hidden: !!item.hidden,
      size: item.size === 'half' ? 'half' : 'full',
    });
  }
  for (const w of widgets) {
    if (seen.has(w.id)) continue;
    merged.push({ id: w.id, hidden: false, size: w.defaultSize ?? 'full' });
  }
  return merged;
}

export interface DashboardLayout {
  /** Full layout in display order. */
  layout: WidgetLayoutItem[];
  /** Visible widgets in display order. */
  visible: WidgetLayoutItem[];
  /** Hidden widgets (for the restore menu). */
  hidden: WidgetLayoutItem[];
  /** True once the persisted layout has been loaded (avoids SSR mismatch). */
  hydrated: boolean;
  move: (id: string, direction: 'up' | 'down') => void;
  moveBefore: (draggedId: string, targetId: string) => void;
  toggleHidden: (id: string) => void;
  setSize: (id: string, size: WidgetSize) => void;
  reset: () => void;
}

export function useDashboardLayout(widgets: WidgetRegistration[], storageKey = 'default'): DashboardLayout {
  const key = `${STORAGE_PREFIX}:${storageKey}`;
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(() => buildDefault(widgets));
  const [hydrated, setHydrated] = useState(false);

  // Load persisted layout once on mount, then reconcile with registrations.
  useEffect(() => {
    let stored: WidgetLayoutItem[] = [];
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) stored = JSON.parse(raw) as WidgetLayoutItem[];
    } catch {
      stored = [];
    }
    setLayout(reconcile(Array.isArray(stored) ? stored : [], widgets));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, widgets.map((w) => w.id).join('|')]);

  // Persist on every change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(layout));
    } catch {
      // ignore quota / privacy-mode failures
    }
  }, [layout, hydrated, key]);

  const move = useCallback((id: string, direction: 'up' | 'down') => {
    setLayout((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const moveBefore = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setLayout((prev) => {
      const from = prev.findIndex((i) => i.id === draggedId);
      const to = prev.findIndex((i) => i.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      const insertAt = next.findIndex((i) => i.id === targetId);
      next.splice(insertAt, 0, moved);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((id: string) => {
    setLayout((prev) => prev.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i)));
  }, []);

  const setSize = useCallback((id: string, size: WidgetSize) => {
    setLayout((prev) => prev.map((i) => (i.id === id ? { ...i, size } : i)));
  }, []);

  const reset = useCallback(() => {
    setLayout(buildDefault(widgets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets.map((w) => w.id).join('|')]);

  return {
    layout,
    visible: layout.filter((i) => !i.hidden),
    hidden: layout.filter((i) => i.hidden),
    hydrated,
    move,
    moveBefore,
    toggleHidden,
    setSize,
    reset,
  };
}
