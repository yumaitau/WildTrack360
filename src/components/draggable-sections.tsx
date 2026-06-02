// src/components/draggable-sections.tsx
"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  EyeOff,
  Eye,
  RotateCcw,
  Columns2,
  Square,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ORDER_STORAGE_KEY,
  HIDDEN_STORAGE_KEY,
  SIZE_STORAGE_KEY,
  TREND_WINDOW_STORAGE_KEY,
  TREND_WINDOW_OPTIONS,
  DEFAULT_TREND_WINDOW,
  reconcileOrder,
  reconcileHidden,
  reconcileSizes,
  validateTrendWindow,
  type WidgetSize,
  type TrendWindow,
} from "@/lib/dashboard-layout";

export interface DashboardSection {
  id: string;
  title: string;
  node: React.ReactNode;
  /** Whether this widget supports a half-width layout on desktop. */
  resizable?: boolean;
}

interface DraggableSectionsProps {
  sections: DashboardSection[];
  /** Show the default-trend-timeframe selector in the toolbar. */
  showTrendWindow?: boolean;
  trendWindow?: TrendWindow;
  onTrendWindowChange?: (weeks: TrendWindow) => void;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — preferences are best-effort */
  }
}

interface SortableWidgetProps {
  section: DashboardSection;
  size: WidgetSize;
  onHide: (id: string) => void;
  onToggleSize: (id: string) => void;
}

function SortableWidget({
  section,
  size,
  onHide,
  onToggleSize,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const isHalf = size === "half" && section.resizable;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        // Mobile: always full width. Desktop: half spans 1 of 2 columns.
        isHalf ? "lg:col-span-1" : "col-span-1 lg:col-span-2",
        isDragging && "z-10 opacity-60",
      )}
    >
      {/* Hover/focus widget controls. Kept out of the normal flow so they do
          not disturb the widget's own layout. */}
      <div
        className={cn(
          "absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border bg-card/95 p-0.5 shadow-sm",
          "opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
          aria-label={`Drag to reorder ${section.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {section.resizable && (
          <button
            type="button"
            onClick={() => onToggleSize(section.id)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              isHalf
                ? `Make ${section.title} full width`
                : `Make ${section.title} half width`
            }
          >
            {isHalf ? (
              <Square className="h-4 w-4" />
            ) : (
              <Columns2 className="h-4 w-4" />
            )}
          </button>
        )}
        <button
          type="button"
          onClick={() => onHide(section.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Hide ${section.title}`}
        >
          <EyeOff className="h-4 w-4" />
        </button>
      </div>

      {section.node}
    </div>
  );
}

export default function DraggableSections({
  sections,
  showTrendWindow = false,
  trendWindow,
  onTrendWindowChange,
}: DraggableSectionsProps) {
  const currentIds = React.useMemo(
    () => sections.map((s) => s.id),
    [sections],
  );
  const sectionMap = React.useMemo(() => {
    const map = new Map<string, DashboardSection>();
    for (const s of sections) map.set(s.id, s);
    return map;
  }, [sections]);

  const [order, setOrder] = React.useState<string[]>(currentIds);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [sizes, setSizes] = React.useState<Record<string, WidgetSize>>({});
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // Hydrate from localStorage once on mount, reconciling against the widgets
  // that actually exist now.
  React.useEffect(() => {
    setOrder(reconcileOrder(readJson<string[]>(ORDER_STORAGE_KEY), currentIds));
    setHidden(
      reconcileHidden(readJson<string[]>(HIDDEN_STORAGE_KEY), currentIds),
    );
    setSizes(
      reconcileSizes(
        readJson<Record<string, unknown>>(SIZE_STORAGE_KEY),
        currentIds,
      ),
    );
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep state reconciled when the set of widgets changes (e.g. role change
  // surfaces a new widget) after the first hydration.
  React.useEffect(() => {
    if (!hydrated) return;
    setOrder((prev) => reconcileOrder(prev, currentIds));
    setHidden((prev) => reconcileHidden(prev, currentIds));
    setSizes((prev) => reconcileSizes(prev, currentIds));
  }, [currentIds, hydrated]);

  const persistOrder = React.useCallback((next: string[]) => {
    setOrder(next);
    writeJson(ORDER_STORAGE_KEY, next);
  }, []);
  const persistHidden = React.useCallback((next: string[]) => {
    setHidden(next);
    writeJson(HIDDEN_STORAGE_KEY, next);
  }, []);
  const persistSizes = React.useCallback(
    (next: Record<string, WidgetSize>) => {
      setSizes(next);
      writeJson(SIZE_STORAGE_KEY, next);
    },
    [],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);
  const visibleOrder = React.useMemo(
    () => order.filter((id) => !hiddenSet.has(id) && sectionMap.has(id)),
    [order, hiddenSet, sectionMap],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Reorder within the full order array (using positions of the visible
    // items) so hidden widgets keep their relative slots.
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    persistOrder(arrayMove(order, oldIndex, newIndex));
  };

  const handleHide = (id: string) => {
    if (hiddenSet.has(id)) return;
    persistHidden([...hidden, id]);
  };

  const handleShow = (id: string) => {
    persistHidden(hidden.filter((h) => h !== id));
  };

  const handleToggleSize = (id: string) => {
    const next: Record<string, WidgetSize> = { ...sizes };
    next[id] = sizes[id] === "half" ? "full" : "half";
    persistSizes(next);
  };

  const handleReset = () => {
    persistOrder([...currentIds]);
    persistHidden([]);
    persistSizes({});
    if (showTrendWindow && onTrendWindowChange) {
      onTrendWindowChange(DEFAULT_TREND_WINDOW);
    }
  };

  const isCustomized =
    hidden.length > 0 ||
    Object.keys(sizes).length > 0 ||
    visibleOrder.join(",") !==
      currentIds.filter((id) => !hiddenSet.has(id)).join(",");

  const hiddenSections = order
    .filter((id) => hiddenSet.has(id) && sectionMap.has(id))
    .map((id) => sectionMap.get(id)!);

  const activeSection = activeId ? sectionMap.get(activeId) : null;

  return (
    <div className="mb-8">
      {/* Layout toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LayoutGrid className="h-4 w-4" />
          <span>Dashboard widgets</span>
          {hidden.length > 0 && (
            <span className="text-xs">
              · {hidden.length} hidden
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showTrendWindow && onTrendWindowChange && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Trend window</span>
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={trendWindow ?? DEFAULT_TREND_WINDOW}
                onChange={(e) =>
                  onTrendWindowChange(validateTrendWindow(e.target.value))
                }
                aria-label="Default trend timeframe in weeks"
              >
                {TREND_WINDOW_OPTIONS.map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks} weeks
                  </option>
                ))}
              </select>
            </label>
          )}
          {isCustomized && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset layout
            </Button>
          )}
        </div>
      </div>

      {/* Hidden widget tray */}
      {hiddenSections.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed bg-muted/40 p-3">
          <span className="text-xs font-medium text-muted-foreground">
            Hidden:
          </span>
          {hiddenSections.map((section) => (
            <Button
              key={section.id}
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => handleShow(section.id)}
              aria-label={`Show ${section.title}`}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              {section.title}
            </Button>
          ))}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {visibleOrder.map((id) => {
              const section = sectionMap.get(id)!;
              return (
                <SortableWidget
                  key={id}
                  section={section}
                  size={sizes[id] ?? "full"}
                  onHide={handleHide}
                  onToggleSize={handleToggleSize}
                />
              );
            })}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeSection ? (
            <div className="opacity-90">{activeSection.node}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
