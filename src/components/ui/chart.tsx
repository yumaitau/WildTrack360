"use client"

/**
 * Shared chart palette helpers for TanStack Charts.
 * Color tokens map to CSS variables defined in the global theme.
 */

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
] as const

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function chartColorRange(count: number): string[] {
  return Array.from({ length: count }, (_, i) => chartColor(i))
}
