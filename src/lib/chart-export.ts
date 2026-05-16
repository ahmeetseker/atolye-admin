/**
 * Chart export utilities — KVKK-safe (client-side only, no upload, no tracking).
 *
 * - `chartToPng`: Locates the Recharts SVG inside the given container, serializes
 *   it (with inlined computed styles) → rasterizes via `<canvas>` → triggers a
 *   download. Pure DOM APIs, NO external deps.
 * - `dataToCSV`: Excel-TR friendly CSV (UTF-8 BOM, CRLF, `;` separator, quoting).
 */

const CSV_BOM = '﻿'
const CSV_SEPARATOR = ';'
const CSV_NEWLINE = '\r\n'

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on next tick — Safari needs the URL alive during click().
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str: string
  if (value instanceof Date) {
    str = value.toISOString()
  } else if (typeof value === 'object') {
    str = JSON.stringify(value)
  } else {
    str = String(value)
  }
  // Quote if cell contains separator, quote, or newline.
  if (
    str.includes(CSV_SEPARATOR) ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert array of objects → CSV string (UTF-8 BOM + CRLF + `;`).
 * Headers are derived from the first row's keys (insertion order).
 */
export function rowsToCsvString(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return CSV_BOM
  const headers = Object.keys(rows[0])
  const headerLine = headers.map(escapeCsvCell).join(CSV_SEPARATOR)
  const lines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h])).join(CSV_SEPARATOR),
  )
  return CSV_BOM + [headerLine, ...lines].join(CSV_NEWLINE)
}

export function dataToCSV(
  rows: Record<string, unknown>[],
  filename: string,
): void {
  const csv = rowsToCsvString(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`
  triggerDownload(blob, name)
}

/**
 * Inline computed CSS styles into the cloned SVG so the rasterized image
 * matches the on-screen render (Recharts relies on stylesheet-applied fills).
 */
function inlineStyles(src: SVGElement, dst: SVGElement): void {
  const srcChildren = src.querySelectorAll<SVGElement>('*')
  const dstChildren = dst.querySelectorAll<SVGElement>('*')
  const srcComputed = getComputedStyle(src)
  let cssText = ''
  for (const prop of [
    'fill',
    'stroke',
    'stroke-width',
    'opacity',
    'font-size',
    'font-family',
    'font-weight',
    'color',
  ]) {
    const v = srcComputed.getPropertyValue(prop)
    if (v) cssText += `${prop}:${v};`
  }
  dst.setAttribute('style', cssText)
  for (let i = 0; i < srcChildren.length; i++) {
    const s = srcChildren[i]
    const d = dstChildren[i]
    if (!d) continue
    const cs = getComputedStyle(s)
    let text = ''
    for (const prop of [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'opacity',
      'fill-opacity',
      'stroke-opacity',
      'font-size',
      'font-family',
      'font-weight',
      'color',
      'text-anchor',
    ]) {
      const v = cs.getPropertyValue(prop)
      if (v) text += `${prop}:${v};`
    }
    d.setAttribute('style', text)
  }
}

export async function chartToPng(
  container: HTMLElement,
  filename: string,
): Promise<void> {
  const srcSvg = container.querySelector('svg')
  if (!srcSvg) throw new Error('chartToPng: no <svg> inside container')

  const rect = srcSvg.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width || srcSvg.clientWidth || 600))
  const height = Math.max(1, Math.round(rect.height || srcSvg.clientHeight || 300))

  const clone = srcSvg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  }
  inlineStyles(srcSvg, clone)

  const xml = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const dpr = window.devicePixelRatio || 1
          const canvas = document.createElement('canvas')
          canvas.width = width * dpr
          canvas.height = height * dpr
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('chartToPng: 2d context unavailable'))
            return
          }
          // Solid background — Recharts SVGs are transparent.
          const bg = getComputedStyle(container).backgroundColor
          ctx.fillStyle = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : '#ffffff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.drawImage(img, 0, 0, width, height)
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('chartToPng: toBlob returned null'))
              return
            }
            const name = filename.endsWith('.png') ? filename : `${filename}.png`
            triggerDownload(blob, name)
            resolve()
          }, 'image/png')
        } catch (err) {
          reject(err)
        }
      }
      img.onerror = () => reject(new Error('chartToPng: SVG image load failed'))
      img.src = svgUrl
    })
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
