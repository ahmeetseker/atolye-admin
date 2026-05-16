/**
 * F6.C — CSV export helpers (Excel-compatible).
 *
 * `toCsv` is a pure function: keys → label header, double-quoted cells with
 * `""` escaping. Spec §6 calls for `,` separator + `\n` line endings — that is
 * what most spreadsheet apps (incl. modern Excel + Numbers + Sheets) parse out
 * of the box once the UTF-8 BOM is in front. The older Excel-TR specific
 * exporter (`lib/chart-export.ts`) uses `;` + CRLF — kept separate by design.
 *
 * `downloadCsv` prepends the BOM, packages a Blob, and triggers an anchor
 * click. Pure DOM APIs, no deps. The Blob URL is revoked synchronously after
 * `click()` returns — Safari needs it alive during click, but our test stubs
 * createObjectURL anyway.
 */

const CSV_BOM = '﻿'

export interface CsvColumn<T> {
  key: keyof T
  label: string
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '""'
  const str = String(value).replace(/"/g, '""')
  return `"${str}"`
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(','),
  )
  return [header, ...lines].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([CSV_BOM + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** YYYY-MM-DD using the local timezone — stable for filenames. */
export function todayStamp(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
