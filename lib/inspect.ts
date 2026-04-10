/**
 * inspect.ts
 * Auto-detect dataset structure from an uploaded xlsx file.
 * One sheet = one chart. No pattern matching required.
 */
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'
import { AUTO_COLORS } from './generator'
import type { ASRDataset, ModelDef, Metric } from './types'

/** Count-like column names that should not be treated as model (data) columns. */
const COUNT_COL_RE = /^\s*(n|count|value.?count|num.?samples?)\s*$/i

/**
 * Detect chart type from the column headers of a sheet.
 * Box: headers include min + max + (median or q2/p50).
 */
function detectChartType(headers: string[]): 'bar' | 'box' {
  const lower = headers.map(h => h.toLowerCase())
  const has = (re: RegExp) => lower.some(h => re.test(h))
  return (has(/\bmin\b/) && has(/\bmax\b/) && has(/\b(median|q2|p50)\b/))
    ? 'box'
    : 'bar'
}

/** Build ModelDef[] from a sheet's column headers (skips first/label col and count col). */
function sheetModelDefs(wb: ReturnType<typeof xlsxRead>, sheetName: string): ModelDef[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const headers = xlsxUtils.sheet_to_csv(ws).split(/\r?\n/)[0].split(',').map(s => s.trim())
  // Skip first (label) column; skip a trailing count column
  const dataCols = headers.slice(1)
  const last = dataCols[dataCols.length - 1] ?? ''
  const cols = COUNT_COL_RE.test(last) ? dataCols.slice(0, -1) : dataCols
  return cols.filter(Boolean).map((col, i) => ({
    col,
    color: AUTO_COLORS[i % AUTO_COLORS.length],
  }))
}

export interface InspectResult {
  dataset:   ASRDataset
  sheetNames: string[]
  colCounts:  Record<string, number>  // sheetName → number of model columns
}

export function inspectXlsx(buffer: Buffer): InspectResult {
  const wb = xlsxRead(buffer, { type: 'buffer' })

  const metrics: Metric[]                   = []
  const colCounts: Record<string, number>   = {}

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const headers  = xlsxUtils.sheet_to_csv(ws).split(/\r?\n/)[0].split(',').map(s => s.trim())
    const defs     = sheetModelDefs(wb, sheetName)
    colCounts[sheetName] = defs.length
    metrics.push({
      label:     sheetName,
      fileKey:   sheetName,
      chartType: detectChartType(headers),
      modelDefs: defs,
    })
  }

  if (metrics.length === 0) {
    throw new Error('No sheets found in the uploaded file.')
  }

  const dataset: ASRDataset = {
    type:         'asr',
    id:           'dataset',
    tag:          'Dataset',
    sectionTitle: 'Dataset',
    yTitle:       'Value',
    source:       'xlsx',
    groups:       {},   // not used in direct mode
    metrics,
  }

  return { dataset, sheetNames: wb.SheetNames, colCounts }
}


