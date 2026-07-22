'use client';

import { cn } from '@/lib/utils';

/**
 * Live character-count and minimum-length feedback for community text fields.
 *
 * Every community composer gates its submit button on trimmed length, but the
 * limits used to be invisible — a user typing "this is a test" only saw a
 * greyed-out button with no reason. This surfaces the requirement as they type:
 * a min-length hint that reads as muted guidance and turns destructive once the
 * field has content but is still too short, plus a running count that warns as
 * it approaches the max and goes destructive at the ceiling.
 *
 * Pair it with validateCommunityText() so the click-time guard and the visual
 * indicator share one source of truth.
 */
export function FieldStatus({
  value,
  min,
  max,
  label = 'characters',
  className,
}: {
  value: string;
  min?: number;
  max?: number;
  /** Noun used in the min-length hint, e.g. "characters". */
  label?: string;
  className?: string;
}) {
  const length = value.trim().length;
  const belowMin = min !== undefined && length > 0 && length < min;
  const emptyButRequired = min !== undefined && length === 0;
  const remaining = min !== undefined ? Math.max(0, min - length) : 0;
  const nearMax = max !== undefined && value.length >= max * 0.9;
  const atMax = max !== undefined && value.length >= max;

  return (
    <div className={cn('flex items-start justify-between gap-3 text-xs', className)}>
      <span className={cn('text-muted-foreground', belowMin && 'font-medium text-destructive')}>
        {belowMin
          ? `${remaining} more ${remaining === 1 ? label.replace(/s$/, '') : label} needed`
          : emptyButRequired
            ? `At least ${min} ${label}`
            : ''}
      </span>
      {max !== undefined && (
        <span
          className={cn(
            'shrink-0 tabular-nums text-muted-foreground',
            nearMax && 'text-ochre',
            atMax && 'font-medium text-destructive'
          )}
          aria-live="polite"
        >
          {value.length}/{max}
        </span>
      )}
    </div>
  );
}

// Mirrors compactText()'s control-character refusal in lib/community/validation.ts
// — the ranges U+0000-U+0008, U+000B, U+000C, U+000E-U+001F — using char codes so
// no literal control characters live in this source file.
function hasDisallowedControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x08 || code === 0x0b || code === 0x0c || (code >= 0x0e && code <= 0x1f)) {
      return true;
    }
  }
  return false;
}

/**
 * Shared client-side guard mirroring lib/community/validation.ts's compactText.
 * Returns a human-readable problem string, or null when the value is valid.
 * Field composers call this on submit and toast the result so a blocked action
 * always explains itself instead of silently doing nothing.
 */
export function validateCommunityText(
  value: string,
  { min, max, field }: { min: number; max: number; field: string }
): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return `${field} is required.`;
  if (trimmed.length < min) return `${field} needs at least ${min} characters.`;
  if (value.length > max) return `${field} must be ${max} characters or fewer.`;
  if (hasDisallowedControlChars(value)) return `${field} contains characters that are not allowed.`;
  return null;
}
