import fs from 'node:fs';
import path from 'node:path';

import { fromCSV } from '@graphysdk/data-import-utils/csv';
import type { Data } from '@graphysdk/viz-engine';

export interface CsvImportResult {
  readonly data: Data;
  /** Compact description for the agent: columns, inferred types, sample rows, row count. */
  readonly summary: string;
}

const SAMPLE_ROW_COUNT = 5;
const TYPE_INSPECTION_ROW_COUNT = 50;

export function importCsvData(csvText: string, fileName: string): CsvImportResult {
  const data = fromCSV(csvText) as Data;
  const columnLines = data.columns.map((column) => {
    const inferredType = inferColumnType(data, column.key);
    const label = column.label ? ` — "${column.label}"` : '';
    return `- ${column.key}${label} (${inferredType})`;
  });
  const sampleRows = data.rows.slice(0, SAMPLE_ROW_COUNT);
  const summary = [
    `Dataset "${fileName}": ${data.rows.length} rows.`,
    'Columns:',
    ...columnLines,
    `First ${sampleRows.length} rows:`,
    JSON.stringify(sampleRows),
  ].join('\n');
  return { data, summary };
}

/**
 * Materializes the parsed dataset into the agent's workspace so it can Read it
 * to inspect ranges and distributions. One row per line keeps the file usable
 * with Read's line-based offset/limit on large datasets.
 */
export function writeWorkspaceDataFile(workspaceDir: string, data: Data): void {
  const rowLines = data.rows.map((row) => JSON.stringify(row));
  const contents = `{\n"columns": ${JSON.stringify(data.columns)},\n"rows": [\n${rowLines.join(',\n')}\n]\n}\n`;
  fs.writeFileSync(path.join(workspaceDir, 'data.json'), contents);
}

function inferColumnType(data: Data, key: string): string {
  const seen = new Set<string>();
  for (const row of data.rows.slice(0, TYPE_INSPECTION_ROW_COUNT)) {
    const value = row[key];
    if (value === null || value === undefined || value === '') continue;
    seen.add(typeof value);
  }
  if (seen.size === 0) return 'empty';
  return [...seen].join(' | ');
}
