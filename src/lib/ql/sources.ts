// Allowlist registry for the safe custom query language.
//
// This is the single source of truth for *what* can be queried. Validation and
// autocomplete both read from here, so a field that is not described here can
// never be selected, grouped, filtered, or summed.
//
// Safety principles (see also the cross-tenant checklist in the agent brief):
//   - The tenant scoping column (clerkOrganizationId) is NEVER a queryable field.
//   - Raw sensitive values (names, notes, addresses, coordinates, microchip /
//     tag numbers, free-text, user ids) are NEVER exposed. Prefer derived
//     booleans (hasNotes) or coarse buckets (foundMonth) instead.
//   - `column` fields map directly to a Prisma scalar and can be filtered in the
//     database. `derive` fields are computed in memory from `reads` columns.

export type PrismaModelKey =
  | 'animal'
  | 'record'
  | 'incidentReport'
  | 'hygieneLog'
  | 'releaseChecklist';

export interface FieldDef {
  /** Human-readable label for UI / table headers. */
  label: string;
  /**
   * Direct Prisma scalar column. When present the field is a 1:1 passthrough and
   * equality/membership filters on it are pushed down to the database.
   */
  column?: string;
  /** Prisma scalar columns required to compute a derived field. */
  reads?: string[];
  /** Computes the field's value for a row (defaults to row[column]). */
  derive?: (row: Record<string, unknown>) => string | number | boolean | null;
  /** May be used in `group by`. */
  groupable?: boolean;
  /** May be used in `where`. */
  filterable?: boolean;
  /** Numeric column eligible for sum/avg. */
  summable?: boolean;
  /** Closed value set, used to validate filters and power autocomplete. */
  enumValues?: readonly string[];
}

export interface SourceDef {
  /** Human-readable label. */
  label: string;
  /** Backing Prisma delegate key on the client. */
  model: PrismaModelKey;
  /** Scalar date column used by `since` / `until` and the default 1-year window. */
  dateField: string;
  fields: Record<string, FieldDef>;
}

const ANIMAL_STATUS = [
  'ADMITTED',
  'IN_CARE',
  'READY_FOR_RELEASE',
  'RELEASED',
  'DECEASED',
  'TRANSFERRED',
  'PERMANENT_CARE',
] as const;

const RECORD_TYPE = ['FEEDING', 'MEDICAL', 'BEHAVIOR', 'LOCATION', 'WEIGHT', 'RELEASE', 'OTHER'] as const;
const INCIDENT_SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const RELEASE_TYPE = ['HARD', 'SOFT', 'PASSIVE'] as const;

/** Format a Date (or ISO string) as a YYYY-MM bucket for monthly trend grouping. */
function toMonth(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Derived boolean: was the named free-text/blob column populated? */
function present(column: string) {
  return {
    reads: [column],
    derive: (row: Record<string, unknown>) => {
      const v = row[column];
      return v !== null && v !== undefined && v !== '';
    },
  };
}

export const SOURCES: Record<string, SourceDef> = {
  animals: {
    label: 'Animals',
    model: 'animal',
    dateField: 'dateFound',
    fields: {
      species: { label: 'Species', column: 'species', groupable: true, filterable: true },
      status: { label: 'Status', column: 'status', groupable: true, filterable: true, enumValues: ANIMAL_STATUS },
      sex: { label: 'Sex', column: 'sex', groupable: true, filterable: true },
      ageClass: { label: 'Age class', column: 'ageClass', groupable: true, filterable: true },
      encounterType: { label: 'Encounter type', column: 'encounterType', groupable: true, filterable: true },
      fate: { label: 'Fate', column: 'fate', groupable: true, filterable: true },
      lifeStage: { label: 'Life stage', column: 'lifeStage', groupable: true, filterable: true },
      animalCondition: { label: 'Condition', column: 'animalCondition', groupable: true, filterable: true },
      initialWeightGrams: { label: 'Initial weight (g)', column: 'initialWeightGrams', summable: true },
      hasNotes: { label: 'Has notes', ...present('notes'), groupable: true, filterable: true },
      hasPhoto: { label: 'Has photo', ...present('photo'), groupable: true, filterable: true },
      foundMonth: {
        label: 'Found month',
        reads: ['dateFound'],
        derive: (row) => toMonth(row.dateFound),
        groupable: true,
      },
    },
  },

  records: {
    label: 'Care records',
    model: 'record',
    dateField: 'date',
    fields: {
      type: { label: 'Record type', column: 'type', groupable: true, filterable: true, enumValues: RECORD_TYPE },
      hasNotes: { label: 'Has notes', ...present('notes'), groupable: true, filterable: true },
      hasLocation: { label: 'Has location', ...present('location'), groupable: true, filterable: true },
      loggedMonth: {
        label: 'Logged month',
        reads: ['date'],
        derive: (row) => toMonth(row.date),
        groupable: true,
      },
    },
  },

  incidents: {
    label: 'Incident reports',
    model: 'incidentReport',
    dateField: 'date',
    fields: {
      type: { label: 'Incident type', column: 'type', groupable: true, filterable: true },
      severity: {
        label: 'Severity',
        column: 'severity',
        groupable: true,
        filterable: true,
        enumValues: INCIDENT_SEVERITY,
      },
      resolved: { label: 'Resolved', column: 'resolved', groupable: true, filterable: true },
      hasAttachment: { label: 'Has attachment', ...present('attachments'), groupable: true, filterable: true },
      reportedMonth: {
        label: 'Reported month',
        reads: ['date'],
        derive: (row) => toMonth(row.date),
        groupable: true,
      },
    },
  },

  hygiene: {
    label: 'Hygiene logs',
    model: 'hygieneLog',
    dateField: 'date',
    fields: {
      type: { label: 'Log type', column: 'type', groupable: true, filterable: true },
      completed: { label: 'Completed', column: 'completed', groupable: true, filterable: true },
      enclosureCleaned: { label: 'Enclosure cleaned', column: 'enclosureCleaned', groupable: true, filterable: true },
      ppeUsed: { label: 'PPE used', column: 'ppeUsed', groupable: true, filterable: true },
      handwashAvailable: { label: 'Handwash available', column: 'handwashAvailable', groupable: true, filterable: true },
      loggedMonth: {
        label: 'Logged month',
        reads: ['date'],
        derive: (row) => toMonth(row.date),
        groupable: true,
      },
    },
  },

  releases: {
    label: 'Release checklists',
    model: 'releaseChecklist',
    dateField: 'releaseDate',
    fields: {
      releaseType: {
        label: 'Release type',
        column: 'releaseType',
        groupable: true,
        filterable: true,
        enumValues: RELEASE_TYPE,
      },
      within10km: { label: 'Within 10km', column: 'within10km', groupable: true, filterable: true },
      completed: { label: 'Completed', column: 'completed', groupable: true, filterable: true },
      releaseMonth: {
        label: 'Release month',
        reads: ['releaseDate'],
        derive: (row) => toMonth(row.releaseDate),
        groupable: true,
      },
    },
  },
};

/** Reserved words that may never be treated as field names. */
export const RESERVED_KEYWORDS = new Set([
  'from',
  'where',
  'and',
  'since',
  'until',
  'group',
  'by',
  'select',
  'count',
  'sum',
  'avg',
  'in',
]);

export function getSource(source: string): SourceDef | undefined {
  return SOURCES[source];
}

export function getField(source: string, field: string): FieldDef | undefined {
  return SOURCES[source]?.fields[field];
}

/** Compute the value of a field for a row, honouring derive vs. direct column. */
export function fieldValue(def: FieldDef, row: Record<string, unknown>): string | number | boolean | null {
  if (def.derive) return def.derive(row);
  if (def.column) {
    const v = row[def.column];
    return (v ?? null) as string | number | boolean | null;
  }
  return null;
}

/** The Prisma scalar columns a field needs selected. */
export function fieldReads(def: FieldDef): string[] {
  if (def.reads) return def.reads;
  if (def.column) return [def.column];
  return [];
}

/** Maximum number of days a query window may span (one year). */
export const MAX_RANGE_DAYS = 366;

/** Maximum rows read from the database for a single query. */
export const ROW_CAP = 10000;

/** Maximum length of a stored / previewed query string. */
export const MAX_QUERY_LENGTH = 2000;

/** Supported visualisations for a query result. */
export const CHART_TYPES = ['table', 'number', 'bar', 'pie', 'line'] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export function isChartType(value: unknown): value is ChartType {
  return typeof value === 'string' && (CHART_TYPES as readonly string[]).includes(value);
}
