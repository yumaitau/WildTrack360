// ─── Custom QL source & field allowlist ──────────────────────────────────────
//
// This file is the SINGLE SOURCE OF TRUTH for what the custom reporting QL can
// see. A source is only queryable if it appears here; a field is only
// groupable/filterable/summable/trendable if it appears in that source's
// `fields` list. Autocomplete, the parser, and the evaluator all derive their
// rules from this object — there is no second, hand-maintained list.
//
// SAFETY RULES baked into the normalisers below:
//   * Every source is tenant-scoped by `clerkOrganizationId` at fetch time
//     (see evaluator.ts). Tenant/org IDs are NEVER exposed as fields.
//   * Only derived/categorical reporting fields are exposed. We deliberately do
//     NOT expose: org/user IDs, Clerk/auth IDs, emails, raw notes/descriptions,
//     coordinates, addresses, attachments/JSON payloads, or raw record IDs.
//   * Free-form text (notes, descriptions) is reduced to boolean `has*` flags
//     so sensitive content can never leak through a report.

import type { NormalizedRow } from './types';
import { toDayKey, toMonthKey } from './time';

// ─── Typed accessors (avoid `any` while reading loosely-typed Prisma rows) ────
function asDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function asString(v: unknown): string | null {
  if (typeof v === 'string') return v;
  return v == null ? null : String(v);
}
function asNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function asBool(v: unknown): boolean {
  return v === true;
}
/** True when a free-form text field has meaningful content (without exposing it). */
function hasText(v: unknown): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}
/** True when a Json array/object attachment field is non-empty. */
function hasAttachment(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === 'object') return Object.keys(v).length > 0;
  return false;
}

type Row = Record<string, unknown>;

export interface CustomQuerySource {
  /** Display label for the workbench. */
  label: string;
  description: string;
  /** Prisma delegate name (e.g. `incidentReport`). */
  model: string;
  /** Scalar DateTime field used for `between` filtering and the default window. */
  dateField: string;
  /** Allowlisted, queryable normalised field names. */
  fields: readonly string[];
  /** Subset of `fields` that are numeric (valid `sum` metrics). */
  numericFields: readonly string[];
  /**
   * True when the underlying table is a current-state snapshot rather than an
   * event log (used by the workbench to warn against treating it as history).
   */
  snapshot?: boolean;
  /** Turn a tenant-scoped Prisma row into a safe, normalised reporting row. */
  normalize: (row: Row) => NormalizedRow;
}

export const CUSTOM_QUERY_SOURCES = {
  animals: {
    label: 'Animals',
    description: 'Animals in care, by species, status and intake.',
    model: 'animal',
    dateField: 'dateFound',
    fields: [
      'species',
      'status',
      'sex',
      'ageClass',
      'outcome',
      'released',
      'deceased',
      'hasPhoto',
      'hasNotes',
      'weightGrams',
      'foundDay',
      'foundMonth',
      'releasedDay',
      'releasedMonth',
    ],
    numericFields: ['weightGrams'],
    snapshot: true,
    normalize: (r) => ({
      species: asString(r.species),
      status: asString(r.status),
      sex: asString(r.sex),
      ageClass: asString(r.ageClass),
      outcome: asString(r.outcome),
      released: r.status === 'RELEASED',
      deceased: r.status === 'DECEASED',
      hasPhoto: hasText(r.photo),
      hasNotes: hasText(r.notes),
      weightGrams: asNumber(r.initialWeightGrams),
      foundDay: toDayKey(asDate(r.dateFound)),
      foundMonth: toMonthKey(asDate(r.dateFound)),
      releasedDay: toDayKey(asDate(r.dateReleased)),
      releasedMonth: toMonthKey(asDate(r.dateReleased)),
    }),
  },
  incidents: {
    label: 'Incidents',
    description: 'Incident reports by type, severity and resolution.',
    model: 'incidentReport',
    dateField: 'date',
    fields: [
      'type',
      'severity',
      'resolved',
      'hasNotes',
      'hasAnimal',
      'hasAttachments',
      'recordedDay',
      'recordedMonth',
    ],
    numericFields: [],
    normalize: (r) => ({
      type: asString(r.type),
      severity: asString(r.severity),
      resolved: asBool(r.resolved),
      hasNotes: hasText(r.notes),
      hasAnimal: r.animalId != null,
      hasAttachments: hasAttachment(r.attachments),
      recordedDay: toDayKey(asDate(r.date)),
      recordedMonth: toMonthKey(asDate(r.date)),
    }),
  },
  hygiene_logs: {
    label: 'Hygiene logs',
    description: 'Biosecurity / hygiene checks and completion status.',
    model: 'hygieneLog',
    dateField: 'date',
    fields: [
      'type',
      'completed',
      'enclosureCleaned',
      'ppeUsed',
      'handwashAvailable',
      'feedingBowlsDisinfected',
      'hasPhotos',
      'loggedDay',
      'loggedMonth',
    ],
    numericFields: [],
    normalize: (r) => ({
      type: asString(r.type),
      completed: asBool(r.completed),
      enclosureCleaned: asBool(r.enclosureCleaned),
      ppeUsed: asBool(r.ppeUsed),
      handwashAvailable: asBool(r.handwashAvailable),
      feedingBowlsDisinfected: asBool(r.feedingBowlsDisinfected),
      hasPhotos: hasAttachment(r.photos),
      loggedDay: toDayKey(asDate(r.date)),
      loggedMonth: toMonthKey(asDate(r.date)),
    }),
  },
  carer_training: {
    label: 'Carer training',
    description: 'Carer training records, hours and expiry.',
    model: 'carerTraining',
    dateField: 'date',
    fields: [
      'trainingType',
      'provider',
      'hasCertificate',
      'expired',
      'trainingHours',
      'completedDay',
      'completedMonth',
    ],
    numericFields: ['trainingHours'],
    // `expired` is computed relative to "now" at normalise time below.
    normalize: (r) => {
      const expiry = asDate(r.expiryDate);
      return {
        trainingType: asString(r.trainingType),
        provider: asString(r.provider),
        hasCertificate: hasText(r.certificateUrl) || hasText(r.certificateNumber),
        expired: expiry != null && expiry.getTime() < Date.now(),
        trainingHours: asNumber(r.trainingHours),
        completedDay: toDayKey(asDate(r.date)),
        completedMonth: toMonthKey(asDate(r.date)),
      };
    },
  },
  records: {
    label: 'Care records',
    description: 'Animal care log entries (feeding, medical, weight, etc.).',
    model: 'record',
    dateField: 'date',
    fields: [
      'type',
      'hasNotes',
      'hasLocation',
      'recordedDay',
      'recordedMonth',
    ],
    numericFields: [],
    normalize: (r) => ({
      type: asString(r.type),
      hasNotes: hasText(r.notes),
      hasLocation: hasText(r.location),
      recordedDay: toDayKey(asDate(r.date)),
      recordedMonth: toMonthKey(asDate(r.date)),
    }),
  },
  release_checklists: {
    label: 'Release checklists',
    description: 'Release readiness checklists by release type.',
    model: 'releaseChecklist',
    dateField: 'releaseDate',
    fields: [
      'releaseType',
      'completed',
      'within10km',
      'releasedDay',
      'releasedMonth',
    ],
    numericFields: [],
    normalize: (r) => ({
      releaseType: asString(r.releaseType),
      completed: asBool(r.completed),
      within10km: asBool(r.within10km),
      releasedDay: toDayKey(asDate(r.releaseDate)),
      releasedMonth: toMonthKey(asDate(r.releaseDate)),
    }),
  },
  post_release_monitoring: {
    label: 'Post-release monitoring',
    description: 'Post-release sightings by reported condition.',
    model: 'postReleaseMonitoring',
    dateField: 'date',
    fields: [
      'animalCondition',
      'hasPhotos',
      'hasNotes',
      'observedDay',
      'observedMonth',
    ],
    numericFields: [],
    normalize: (r) => ({
      animalCondition: asString(r.animalCondition),
      hasPhotos: hasAttachment(r.photos),
      hasNotes: hasText(r.notes),
      observedDay: toDayKey(asDate(r.date)),
      observedMonth: toMonthKey(asDate(r.date)),
    }),
  },
  assets: {
    label: 'Assets',
    description: 'Equipment / asset inventory by type and status.',
    model: 'asset',
    dateField: 'createdAt',
    fields: [
      'type',
      'status',
      'hasAssignee',
      'createdDay',
      'createdMonth',
    ],
    numericFields: [],
    snapshot: true,
    normalize: (r) => ({
      type: asString(r.type),
      status: asString(r.status),
      hasAssignee: hasText(r.assignedTo),
      createdDay: toDayKey(asDate(r.createdAt)),
      createdMonth: toMonthKey(asDate(r.createdAt)),
    }),
  },
} as const satisfies Record<string, CustomQuerySource>;

export type CustomQuerySourceName = keyof typeof CUSTOM_QUERY_SOURCES;

/** Plain {source: fields[]} view, handy for autocomplete in the client. */
export const CUSTOM_QUERY_FIELDS_BY_SOURCE: Record<string, readonly string[]> =
  Object.fromEntries(
    Object.entries(CUSTOM_QUERY_SOURCES).map(([name, cfg]) => [name, cfg.fields])
  );

export function isCustomQuerySource(name: string): name is CustomQuerySourceName {
  return Object.prototype.hasOwnProperty.call(CUSTOM_QUERY_SOURCES, name);
}

export function getCustomQuerySource(name: string): CustomQuerySource | null {
  return isCustomQuerySource(name) ? CUSTOM_QUERY_SOURCES[name] : null;
}
