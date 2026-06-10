// Minimal RFC 4180 CSV serialize + parse. No deps. Handles quoted fields,
// embedded commas/newlines, and doubled-quote escapes.

// Cells starting with =, +, -, @, tab, or CR are interpreted as formulas by
// Excel/Sheets/Numbers. Prefix with a single quote so the spreadsheet shows
// the literal text instead of evaluating it.
function neutralizeFormula(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);
  if (raw === '') return '';
  const s = neutralizeFormula(raw);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

// Parse CSV text into rows of strings. Returns [] for empty input.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const src = text.replace(/^﻿/, '');

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      i++;
      continue;
    }
    if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (inQuotes) {
    throw new Error('Malformed CSV: unterminated quoted field');
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

// Parse CSV with a header row. Returns [{header: value}, ...] using string values.
export function parseCsvObjects(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const matrix = parseCsv(text);
  if (matrix.length === 0) return { headers: [], rows: [] };
  const headers = matrix[0].map((h) => h.trim());
  const rows = matrix.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? '').trim();
    });
    return obj;
  });
  return { headers, rows };
}
