/**
 * inspect.ts
 * Auto-detect dataset structure from an uploaded xlsx file.
 * One sheet = one chart. No pattern matching required.
 */
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'
import type { ASRDataset, ModelDef, Metric } from './types'

/** Count-like column names that should not be treated as model (data) columns. */
const COUNT_COL_RE = /^\s*(n|count|value.?count|num.?samples?)\s*$/i

/**
 * Detect chart type from a sheet.
 * Box: first column of data rows contains stat labels q1 + q3 + median
 * (i.e. the new explicit-stats row format).
 */
function detectChartType(wb: ReturnType<typeof xlsxRead>, sheetName: string): 'bar' | 'box' | 'scatter' {
  const ws = wb.Sheets[sheetName]
  if (!ws) return 'bar'
  const lines = xlsxUtils.sheet_to_csv(ws)
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.replace(/,/g, '').trim() !== '')
  const dataRows = lines.slice(1)
  const firstColValues = dataRows.map(l => l.split(',')[0].trim().toLowerCase())
  const has = (re: RegExp) => firstColValues.some(v => re.test(v))
  if (has(/^q1$/) && has(/^q3$/) && has(/^(median|q2|p50)$/)) return 'box'
  if (dataRows.length === 2) return 'scatter'
  return 'bar'
}

/** Build ModelDef[] from a sheet's column headers (skips first/label col and count col). */
function sheetYTitle(wb: ReturnType<typeof xlsxRead>, sheetName: string, chartType: 'bar' | 'box' | 'scatter'): string {
  const ws = wb.Sheets[sheetName]
  if (!ws) return 'Value'
  const lines = xlsxUtils.sheet_to_csv(ws).split(/\r?\n/).filter(l => l.replace(/,/g, '').trim() !== '')
  // Scatter: row 1 = x-axis (handled by buildScatterSpec), row 2 = y-axis
  const rowIndex = chartType === 'scatter' ? 2 : 1
  return lines[rowIndex]?.split(',')[0]?.trim() || 'Value'
}

function sheetModelDefs(wb: ReturnType<typeof xlsxRead>, sheetName: string): ModelDef[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const headers = xlsxUtils.sheet_to_csv(ws).split(/\r?\n/)[0].split(',').map(s => s.trim())
  // Skip first (label) column; skip a trailing count column
  const dataCols = headers.slice(1)
  const last = dataCols[dataCols.length - 1] ?? ''
  const cols = COUNT_COL_RE.test(last) ? dataCols.slice(0, -1) : dataCols
  return cols.filter(Boolean).map(col => ({ col }))
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
    const defs      = sheetModelDefs(wb, sheetName)
    const chartType = detectChartType(wb, sheetName)
    colCounts[sheetName] = defs.length
    metrics.push({
      label:     sheetName,
      fileKey:   sheetName,
      chartType,
      modelDefs: defs,
      yTitle:    sheetYTitle(wb, sheetName, chartType),
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


