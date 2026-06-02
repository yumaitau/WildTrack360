'use client';

// A draggable / hideable / resizable widget grid.
//
// Reordering works with:
//   - mouse + touch: unified Pointer Events on the drag handle, reordering live
//     by hit-testing the widget under the pointer;
//   - keyboard: the drag handle is a button; ArrowUp / ArrowDown move the widget,
//     and explicit move buttons are always available.
//
// Layout (order / hidden / size) persists to localStorage via useDashboardLayout.
// Half-width widgets sit two-up on desktop and go full-width on mobile.
//
// The chrome (drag handle + controls) floats in the corner so it overlays each
// widget's own card header instead of nesting a second card.

import * as React from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useDashboardLayout, type WidgetSize } from '@/hooks/use-dashboard-layout';

export interface DashboardWidget {
  id: string;
  title: string;
  defaultSize?: WidgetSize;
  render: () => React.ReactNode;
}

interface WidgetGridProps {
  widgets: DashboardWidget[];
  /** Distinguishes localStorage entries when multiple grids exist. */
  storageKey?: string;
  title?: string;
}

export function WidgetGrid({ widgets, storageKey = 'default', title = 'Dashboard' }: WidgetGridProps) {
  const registrations = React.useMemo(
    () => widgets.map((w) => ({ id: w.id, defaultSize: w.defaultSize })),
    [widgets]
  );
  const { visible, hidden, hydrated, move, moveBefore, toggleHidden, setSize, reset } = useDashboardLayout(
    registrations,
    storageKey
  );
  const byId = React.useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!draggingId) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetEl = el?.closest('[data-widget-id]') as HTMLElement | null;
      const targetId = targetEl?.dataset.widgetId;
      if (targetId && targetId !== draggingId) {
        moveBefore(draggingId, targetId);
      }
    },
    [draggingId, moveBefore]
  );

  const endDrag = React.useCallback(() => setDraggingId(null), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
        <DashboardToolbar
          hidden={hidden.map((h) => ({ id: h.id, title: byId.get(h.id)?.title ?? h.id }))}
          onRestore={toggleHidden}
          onReset={reset}
        />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
      >
        {visible.map((item, index) => {
          const widget = byId.get(item.id);
          if (!widget) return null;
          return (
            <WidgetCard
              key={item.id}
              id={item.id}
              title={widget.title}
              size={item.size}
              index={index}
              total={visible.length}
              dragging={draggingId === item.id}
              onDragStart={() => setDraggingId(item.id)}
              onDragEnd={endDrag}
              onMove={(dir) => move(item.id, dir)}
              onToggleSize={() => setSize(item.id, item.size === 'half' ? 'full' : 'half')}
              onHide={() => toggleHidden(item.id)}
            >
              {widget.render()}
            </WidgetCard>
          );
        })}
      </div>
    </div>
  );
}

interface WidgetCardProps {
  id: string;
  title: string;
  size: WidgetSize;
  index: number;
  total: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onToggleSize: () => void;
  onHide: () => void;
  children: React.ReactNode;
}

function WidgetCard({
  id,
  title,
  size,
  index,
  total,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onToggleSize,
  onHide,
  children,
}: WidgetCardProps) {
  const handleRef = React.useRef<HTMLButtonElement>(null);

  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Begin a pointer drag (mouse or touch). Capture so move/up keep firing.
    handleRef.current?.setPointerCapture(e.pointerId);
    onDragStart();
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      handleRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    onDragEnd();
  };

  const onHandleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onMove('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onMove('down');
    }
  };

  return (
    <section
      data-widget-id={id}
      aria-label={title}
      className={cn(
        'group relative transition-opacity',
        size === 'full' ? 'lg:col-span-2' : 'lg:col-span-1',
        dragging && 'opacity-60'
      )}
    >
      {/* Floating control chrome — revealed on hover or keyboard focus. */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-md border bg-card/95 p-0.5 shadow-sm opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${title}. Use arrow keys to move.`}
          className="touch-none cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
          onPointerDown={onHandlePointerDown}
          onPointerUp={onHandlePointerUp}
          onKeyDown={onHandleKeyDown}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove('up')}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Move down"
          disabled={index === total - 1}
          onClick={() => onMove('down')}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hidden lg:inline-flex"
          aria-label={size === 'half' ? 'Make full width' : 'Make half width'}
          onClick={onToggleSize}
        >
          {size === 'half' ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Hide ${title}`} onClick={onHide}>
          <EyeOff className="h-4 w-4" />
        </Button>
      </div>

      <div className={cn('h-full rounded-lg', dragging && 'ring-2 ring-primary')}>{children}</div>
    </section>
  );
}

interface DashboardToolbarProps {
  hidden: { id: string; title: string }[];
  onRestore: (id: string) => void;
  onReset: () => void;
}

function DashboardToolbar({ hidden, onRestore, onReset }: DashboardToolbarProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-2" />
          Widgets
          {hidden.length > 0 && <span className="ml-2 rounded-full bg-muted px-1.5 text-xs">{hidden.length}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Hidden widgets</DropdownMenuLabel>
        {hidden.length === 0 ? (
          <DropdownMenuItem disabled>No hidden widgets</DropdownMenuItem>
        ) : (
          hidden.map((h) => (
            <DropdownMenuItem key={h.id} onSelect={() => onRestore(h.id)}>
              <Eye className="h-4 w-4 mr-2" />
              Restore “{h.title}”
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onReset()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset layout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
