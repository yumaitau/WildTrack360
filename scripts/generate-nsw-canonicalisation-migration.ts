// Generates a Prisma SQL migration that rewrites legacy NSW picklist values
// on existing Animal records to match the authoritative values now shipped
// in src/lib/nsw-picklists.ts.
//
// Run with: npx tsx scripts/generate-nsw-canonicalisation-migration.ts
//
// The generated migration is idempotent — running it multiple times is safe
// because each UPDATE targets only rows still holding a legacy value.

import { promises as fs } from 'fs';
import path from 'path';

import {
  NSW_ENCOUNTER_TYPES,
  NSW_FATE_OPTIONS,
  NSW_POUCH_CONDITIONS,
  NSW_ANIMAL_CONDITIONS,
} from '../src/lib/compliance-rules';
import {
  NSW_ENCOUNTER_TYPE,
  NSW_FATE,
  NSW_ANIMAL_CONDITION,
  NSW_POUCH_CONDITION,
} from '../src/lib/nsw-picklists';

// ─── Normalisation & matching ───────────────────────────────────────────────

function normalise(value: string): string {
  return value
    .toLowerCase()
    // Collapse any dash variant to ASCII hyphen
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    // Treat slashes, hyphens, and surrounding whitespace as a single space
    // so "Stranded/haul-out" and "Stranded / Haul out" collapse to the same
    // token stream regardless of separator choice.
    .replace(/\s*[/-]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Explicit semantic overrides for cases where NSW's canonical label uses
// different wording than the legacy value (not a simple casing/punctuation
// difference). Each entry maps an old value to the NSW canonical value.
const SEMANTIC_OVERRIDES: Record<string, Record<string, string>> = {
  encounter_type: {
    // None — the fuzzy matcher catches every encounter-type difference.
  },
  fate: {
    'Transferred to an authorised animal park/zoo':
      'Transferred to an authorised fauna park or zoo',
  },
  pouch_condition: {
    NA: 'N/A',
  },
  animal_condition: {
    Emaciated: 'Malnourished',
    Good: 'No apparent distress',
    // "Poor" and "Fair" have no direct NSW equivalent — leave for the user
    // to reselect via the legacy fallback in the intake form.
  },
};

interface Mapping {
  column: string;
  table: string;
  field: string; // camelCase for log output only
  old: string;
  canonical: string;
}

function buildMappings(
  column: string,
  field: string,
  oldValues: readonly string[],
  newValues: readonly string[],
): { mappings: Mapping[]; unmapped: string[] } {
  const newByNorm = new Map<string, string>();
  for (const v of newValues) newByNorm.set(normalise(v), v);
  const overrides = SEMANTIC_OVERRIDES[column] ?? {};

  const mappings: Mapping[] = [];
  const unmapped: string[] = [];

  for (const old of oldValues) {
    let canonical: string | undefined = overrides[old];
    if (!canonical) canonical = newByNorm.get(normalise(old));
    if (!canonical) {
      unmapped.push(old);
      continue;
    }
    if (canonical === old) continue;
    mappings.push({ column, table: 'animals', field, old, canonical });
  }

  return { mappings, unmapped };
}

// ─── SQL emission ───────────────────────────────────────────────────────────

function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}

function emitUpdateBlock(
  table: string,
  column: string,
  field: string,
  mappings: Mapping[],
): string {
  if (mappings.length === 0) {
    return `-- No legacy ${field} values to rewrite.\n`;
  }
  const whenLines = mappings
    .map((m) => `    WHEN ${column} = '${sqlEscape(m.old)}' THEN '${sqlEscape(m.canonical)}'`)
    .join('\n');
  const inValues = mappings.map((m) => `'${sqlEscape(m.old)}'`).join(', ');
  return `-- Canonicalise ${field}: ${mappings.length} legacy value(s) rewritten
UPDATE "${table}"
SET ${column} = CASE
${whenLines}
    ELSE ${column}
END
WHERE ${column} IN (${inValues});
`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const encounterOld = Object.values(NSW_ENCOUNTER_TYPES).flat();
  const encounter = buildMappings(
    'encounter_type',
    'encounterType',
    encounterOld,
    NSW_ENCOUNTER_TYPE.map((i) => i.value),
  );
  const fate = buildMappings(
    'fate',
    'fate',
    NSW_FATE_OPTIONS,
    NSW_FATE.map((i) => i.value),
  );
  const pouch = buildMappings(
    'pouch_condition',
    'pouchCondition',
    NSW_POUCH_CONDITIONS,
    NSW_POUCH_CONDITION,
  );
  const condition = buildMappings(
    'animal_condition',
    'animalCondition',
    NSW_ANIMAL_CONDITIONS,
    NSW_ANIMAL_CONDITION.map((i) => i.value),
  );

  const allUnmapped = [
    ...encounter.unmapped.map((v) => `encounter_type: ${v}`),
    ...fate.unmapped.map((v) => `fate: ${v}`),
    ...pouch.unmapped.map((v) => `pouch_condition: ${v}`),
    ...condition.unmapped.map((v) => `animal_condition: ${v}`),
  ];

  console.log('Rewrites planned:');
  console.log(`  encounter_type  : ${encounter.mappings.length}`);
  console.log(`  fate            : ${fate.mappings.length}`);
  console.log(`  pouch_condition : ${pouch.mappings.length}`);
  console.log(`  animal_condition: ${condition.mappings.length}`);

  if (allUnmapped.length > 0) {
    console.log('\nUnmapped legacy values (leaving existing rows untouched — verify by hand):');
    for (const u of allUnmapped) console.log(`  - ${u}`);
  } else {
    console.log('\nAll legacy values mapped cleanly.');
  }

  const sql = `-- Canonicalise legacy NSW picklist values on existing Animal records.
-- Generated from src/lib/compliance-rules.ts (legacy) → src/lib/nsw-picklists.ts
-- (authoritative, sourced from the NSW DCCEEW Detailed Report template).
--
-- This migration is idempotent: each UPDATE targets only rows still holding
-- a legacy value. Rows that already hold the canonical NSW value are
-- unaffected.

${emitUpdateBlock('animals', 'encounter_type', 'encounterType', encounter.mappings)}
${emitUpdateBlock('animals', 'fate', 'fate', fate.mappings)}
${emitUpdateBlock('animals', 'pouch_condition', 'pouchCondition', pouch.mappings)}
${emitUpdateBlock('animals', 'animal_condition', 'animalCondition', condition.mappings)}`;

  // Timestamp in Prisma's standard format (YYYYMMDDHHmmss).
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getUTCFullYear()}` +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds());
  const dir = path.join(
    __dirname,
    '..',
    'prisma',
    'migrations',
    `${stamp}_canonicalise_nsw_picklist_values`,
  );
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, 'migration.sql');
  await fs.writeFile(target, sql);
  console.log(`\nWrote ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
