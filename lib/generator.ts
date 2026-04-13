/**
 * generator.ts
 * Pure TypeScript port of generate-charts-vl.mjs.
 * No file I/O — accepts data as strings/buffers, returns SVG strings.
 * Used by the /api/generate route.
 */

import { compile } from 'vega-lite'
import * as vega from 'vega'
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'

import type { ChartConfig, ModelDef, SeriesColor, GeneratedCard } from './types'

// ── Types local to the generator ─────────────────────────────────────────────

interface ASRRow {
  category: string
  values:   Record<string, number>
  count:    number
}

interface ASRParsed {
  modelDefs: ModelDef[]
  rows:      ASRRow[]
}

interface ClusteredRow {
  models:   string[]
  values:   number[]
  category: string
}

// ── CSV parsers ───────────────────────────────────────────────────────────────

const COUNT_COL_RE = /^\s*(n|count|value.?count|num.?samples?)\s*$/i

export function parseASRCsv(content: string, modelDefs: ModelDef[]): ASRParsed {
  const lines   = content.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.replace(/,/g, '').trim() !== '')
  const headers = lines[0].split(',')
  // Detect a trailing count column by name; fall back to the last column if it
  // isn't a model column defined in modelDefs.
  const lastHeader     = headers[headers.length - 1].trim()
  const modelColNames  = new Set(modelDefs.map(m => m.col))
  const hasCountCol    = COUNT_COL_RE.test(lastHeader) || !modelColNames.has(lastHeader)
  const dataHeaders    = hasCountCol ? headers.slice(1, -1) : headers.slice(1)
  const countColIndex  = hasCountCol ? headers.length - 1 : -1

  const rows: ASRRow[] = lines.slice(1).map(line => {
    const cols  = line.split(',')
    const count = countColIndex >= 0 ? (parseInt(cols[countColIndex]) || 0) : 0
    const entry: ASRRow = { category: cols[0], values: {}, count }
    dataHeaders.forEach((h, i) => { entry.values[h] = parseFloat(cols[i + 1]) })
    return entry
  })
  return { modelDefs, rows }
}

export function parseClusteredCsv(content: string): ClusteredRow[] {
  const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows: ClusteredRow[] = []
  for (const line of lines.slice(1)) {
    const m = line.match(/"\[([^\]]+)\]","?\[([^\]]+)\]"?,(.+)/)
    if (!m) continue
    rows.push({
      models:   m[1].split(',').map(s => s.trim()),
      values:   m[2].split(',').map(s => parseFloat(s.trim())),
      category: m[3].trim(),
    })
  }
  return rows
}

// ── XLSX helpers ─────────────────────────────────────────────────────────────

/** Normalize a string for fuzzy comparison: lowercase, collapse whitespace. */
function normalizeSheetName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Word-overlap similarity between two normalized strings.
 * Returns fraction of `query` words found in `candidate`.
 */
function wordOverlap(query: string, candidate: string): number {
  const qWords = query.split(' ')
  const cWords = new Set(candidate.split(' '))
  const hits = qWords.filter(w => cWords.has(w)).length
  return hits / qWords.length
}

/** Find the best matching sheet name, with fuzzy fallback. */
function resolveSheetName(wb: ReturnType<typeof xlsxRead>, target: string): string | null {
  // 1. Exact match
  if (wb.Sheets[target]) return target

  const normTarget = normalizeSheetName(target)

  // 2. Case / whitespace normalized exact match
  for (const name of wb.SheetNames) {
    if (normalizeSheetName(name) === normTarget) return name
  }

  // 3. Best word-overlap match (require at least 50% overlap)
  let bestScore = 0.5
  let bestName: string | null = null
  for (const name of wb.SheetNames) {
    const score = wordOverlap(normTarget, normalizeSheetName(name))
    if (score > bestScore) {
      bestScore = score
      bestName = name
    }
  }
  return bestName
}

export function xlsxSheetToCsv(buffer: Buffer, sheetName: string): string {
  const wb = xlsxRead(buffer, { type: 'buffer' })
  const resolved = resolveSheetName(wb, sheetName)
  if (!resolved) {
    throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`)
  }
  return xlsxUtils.sheet_to_csv(wb.Sheets[resolved])
}

export function xlsxSheetNames(buffer: Buffer): string[] {
  const wb = xlsxRead(buffer, { type: 'buffer' })
  return wb.SheetNames
}

// ── Vega-Lite spec builders ───────────────────────────────────────────────────

function yAxis(C: ChartConfig, title: string) {
  return {
    labels:          C.showYTickLabels,
    labelColor:      C.axisTickColor,
    labelFontSize:   C.axisTickSize,
    labelFontWeight: C.axisTickWeight,
    labelFont:       C.fontMono,
    labelPadding:    C.yAxisLabelPadding,
    tickColor:       C.axisTickColor,
    domainColor:     C.axisTickColor,
    title:           C.showYTitle ? title : null,
    titleColor:      C.yTitleColor,
    titleFontSize:   C.yTitleSize,
    titleFontWeight: C.yTitleWeight,
    titleAlign:      C.yTitleAlign,
    titleBaseline:   'bottom',
    titleY:          C.yTitleY,
    titleFont:       C.fontSans,
    gridColor:       C.gridColorY,
    tickCount:       5,
  }
}

export const AUTO_COLORS: SeriesColor[] = [
  { bg: 'rgba(189,228,202,0.82)', border: '#004918' },
  { bg: 'rgba(179,211,255,0.82)', border: '#0a70ff' },
  { bg: 'rgba(255,181,133,0.82)', border: '#612700' },
  { bg: 'rgba(240,215,255,0.82)', border: '#a811ff' },
  { bg: 'rgba(255,220,150,0.82)', border: '#c08020' },
  { bg: 'rgba(255,160,160,0.82)', border: '#c04040' },
  { bg: 'rgba(160,230,230,0.82)', border: '#006060' },
  { bg: 'rgba(210,210,210,0.82)', border: '#505050' },
]

export function buildASRSpec(C: ChartConfig, parsed: ASRParsed, yTitle: string, pivot = false, hideXLabels = false) {
  const { modelDefs, rows } = parsed

  // When there is only one data row (and not pivot mode), skip x-clustering: put
  // model directly on x so we don't get a phantom "category" cluster group.
  const flatMode = !pivot && rows.length === 1

  // Single-series mode: one model column, multiple rows → color by category so
  // each bar gets a distinct color instead of every bar sharing AUTO_COLORS[0].
  const singleSeries = !pivot && modelDefs.length === 1

  // Build color scales keyed by model name so colors are reliably bound by name,
  // not by data-embedded values (which require scale:null and are fragile in Vega-Lite 6).
  // In pivot mode, the 'model' field holds row.category; colors cycle over rows.
  // In single-series mode, colors cycle over categories (rows) instead of models.
  const colorScaleDomain: string[] = singleSeries
    ? rows.map(r => r.category)
    : pivot
      ? rows.map(r => r.category)
      : modelDefs.map(d => d.label ?? d.col)
  const colorBgRange: string[] = singleSeries
    ? rows.map((_, ri) => AUTO_COLORS[ri % AUTO_COLORS.length].bg)
    : pivot
      ? rows.map((_, ri) => AUTO_COLORS[ri % AUTO_COLORS.length].bg)
      : modelDefs.map((d, mi) => (d.color ?? AUTO_COLORS[mi % AUTO_COLORS.length]).bg)
  const colorBorderRange: string[] = singleSeries
    ? rows.map((_, ri) => AUTO_COLORS[ri % AUTO_COLORS.length].border)
    : pivot
      ? rows.map((_, ri) => AUTO_COLORS[ri % AUTO_COLORS.length].border)
      : modelDefs.map((d, mi) => (d.color ?? AUTO_COLORS[mi % AUTO_COLORS.length]).border)

  const values: object[] = []
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri]
    for (let mi = 0; mi < modelDefs.length; mi++) {
      const { col, label } = modelDefs[mi]
      const modelName = pivot ? row.category : (label ?? col)
      // colorKey drives the Vega-Lite color scale:
      //   single-series → category (so each bar is distinct)
      //   multi-series / pivot → model name (as before)
      const colorKey = singleSeries ? row.category : modelName
      const idx = colorScaleDomain.indexOf(colorKey)
      values.push({
        category:   pivot ? (label ?? col) : row.category,
        model:      modelName,
        colorKey,
        labelColor: colorBorderRange[idx >= 0 ? idx : mi],
        wer:        row.values[col] ?? 0,
      })
    }
  }

  // Auto-compute label decimal places: enough so the smallest non-zero value
  // doesn't round to zero. e.g. 0.00052 needs 4 decimals.
  const nonZero = (values as { wer: number }[]).map(v => Math.abs(v.wer)).filter(v => v > 0)
  const autoDecimals = nonZero.length > 0
    ? Math.max(C.dataLabelDecimals, Math.min(6, Math.ceil(-Math.log10(Math.min(...nonZero))) + 1))
    : C.dataLabelDecimals

  const xAxisStyle = {
    labels:        !hideXLabels && C.showClusterLabels,
    labelColor:    C.axisTickColor,
    labelFontSize: C.axisTickSize,
    labelFont:     C.fontSans,
    ticks:         false,
    domain:        true,
    domainColor:   C.axisTickColor,
    title:         null,
    grid:          false,
  }

  // sort: null preserves data (import) order; 'ascending'/'descending' = alpha sort
  const vlSort = C.barSortOrder === 'none' ? null : C.barSortOrder

  // In pivot mode, category=modelName and model=rowLabel, so domains must follow the field contents.
  const colDomain = modelDefs.map(d => d.label ?? d.col)  // model names, e.g. Google/AWS/Azure/Whisper
  const rowDomain = rows.map(r => r.category)              // row labels, e.g. "WER (Regular)"

  // category field contains: pivot → colDomain, normal → rowDomain
  const xCatDomain    = pivot ? colDomain : rowDomain
  // model field contains:    pivot → rowDomain, normal → colDomain
  const xOffsetDomain = pivot ? rowDomain : colDomain

  // flatMode: x = model directly (no xOffset grouping)
  const xEncFlat = {
    field: 'model',
    type:  'nominal' as const,
    sort:  vlSort,
    scale: { domain: vlSort ? undefined : xOffsetDomain, paddingInner: C.barPaddingInner, paddingOuter: 0.5 },
    axis:  { ...xAxisStyle, labels: false },  // labels suppressed; text layer handles it
  }

  // clustered mode: x = category, xOffset = model — category label on top
  const xEncClustered = {
    field: 'category',
    type:  'nominal' as const,
    sort:  vlSort,
    scale: {
      ...(vlSort ? {} : { domain: xCatDomain }),
      paddingInner: C.clusterPaddingInner,
      ...(C.clusterStep != null ? { step: C.clusterStep } : {}),
    },
    axis:  { ...xAxisStyle, orient: 'top' as const, labelAngle: 0, domain: false },
  }

  const xEnc     = flatMode ? xEncFlat    : xEncClustered
  const xOffsetE = flatMode ? undefined   : { field: 'model', type: 'nominal' as const, sort: vlSort, scale: { domain: vlSort ? undefined : xOffsetDomain, paddingInner: C.barPaddingInner } }
  const xTextEnc = flatMode ? xEncFlat    : xEncClustered
  const xTextOff = flatMode ? undefined   : { field: 'model', type: 'nominal' as const, sort: vlSort, scale: { domain: vlSort ? undefined : xOffsetDomain } }

  // Width: when clusterStep is set, use Vega-Lite { step } syntax so each cluster
  // group has exactly that many px — total width is derived automatically.
  // Otherwise fall back to chartWidth with auto-widen floor.
  const numCategories = pivot ? modelDefs.length : rows.length
  const numModels     = pivot ? rows.length       : modelDefs.length
  const specWidth: number | { step: number } =
    flatMode
      ? C.chartWidth
      : C.clusterStep != null
        ? { step: C.clusterStep }
        : Math.max(C.chartWidth, numCategories * numModels * (C.barWidth + 4))

  const dataMax = Math.max(...values.map(v => (v as { wer: number }).wer), 0)
  const yDomainMax = dataMax > 0 ? dataMax * (1 + C.yScalePadding / 100) : 1

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      specWidth,
    height:     C.chartHeight,
    padding:    { top: C.paddingTop, right: C.paddingRight, bottom: C.paddingBottom, left: C.paddingLeft },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values },
    layer: [
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x:       xEnc,
          ...(xOffsetE ? { xOffset: xOffsetE } : {}),
          y:       { field: 'wer', type: 'quantitative', scale: { zero: true, domainMax: yDomainMax }, axis: yAxis(C, yTitle) },
          color:   { field: 'colorKey', type: 'nominal', scale: { domain: colorScaleDomain, range: colorBgRange }, legend: null },
        },
      },
      {
        mark: { type: 'text', clip: false, dy: -(C.dataLabelSize / 2 + 4), fontSize: C.dataLabelSize, fontWeight: C.dataLabelWeight, font: C.fontMono, fill: C.dataLabelColor },
        encoding: {
          x:       xTextEnc,
          ...(xTextOff ? { xOffset: xTextOff } : {}),
          y:       { field: 'wer',   type: 'quantitative' },
          text:    { field: 'wer',   format: `.${autoDecimals}f` },
        },
      },
      {
        mark: { type: 'text', clip: false, angle: 90, align: 'left', baseline: 'top', dx: C.barLabelPaddingTop, dy: C.barLabelOffsetY, fontSize: C.barLabelSize, fontWeight: C.barLabelWeight, font: C.fontSans, lineBreak: '\n' },
        encoding: {
          x:       xTextEnc,
          ...(xTextOff ? { xOffset: xTextOff } : {}),
          y:       { value: C.chartHeight },
          text:    { field: 'model' },
          color:   { field: 'labelColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // Bottom axis domain line (replaces domain removed from top-oriented axis)
      ...(C.showXDomain ? [{
        mark: { type: 'rule', strokeWidth: 1 },
        encoding: {
          y:      { datum: 0, type: 'quantitative' as const },
          stroke: { value: C.axisTickColor },
        },
      }] : []),
    ],
  }
}

// ── Box plot support ──────────────────────────────────────────────────────────

interface BoxRow {
  label:  string
  min:    number
  q1:     number
  median: number
  q3:     number
  max:    number
  color:  SeriesColor
}

/**
 * Parse the explicit-stats box format:
 *   Row 0:   header row — col 0 = sheet label, cols 1+ = model names
 *   Data rows: col 0 = stat label (mean/lower/q1/median/q3/upper/count), cols 1+ = values
 * One BoxRow is emitted per model column.
 */
export function parseBoxCsv(csv: string, modelDefs?: ModelDef[]): BoxRow[] {
  const lines   = csv.trim().split(/\r?\n/).map(l => l.trim()).filter(l => l.replace(/,/g, '').trim() !== '')
  const headers = lines[0].split(',').map(s => s.trim())
  const dataCols = headers.slice(1)
  if (dataCols.length === 0) throw new Error(`Box plot: no data columns found. Headers: ${headers.join(', ')}`)

  // Index stat rows by their first-column label (lowercase)
  const statMap = new Map<string, number[]>()
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(s => s.trim())
    const key   = cells[0].toLowerCase()
    statMap.set(key, dataCols.map((_, ci) => parseFloat(cells[ci + 1]) || 0))
  }

  const get = (keys: string[], ci: number): number => {
    for (const k of keys) {
      const row = statMap.get(k)
      if (row !== undefined) return row[ci]
    }
    return 0
  }

  // Build a lookup from col name → ModelDef color for user-overridden colors
  const colorByCol = new Map(modelDefs?.map(d => [d.col, d.color]) ?? [])

  return dataCols.map((colName, ci) => ({
    label:  colName,
    color:  colorByCol.get(colName) ?? AUTO_COLORS[ci % AUTO_COLORS.length],
    min:    get(['lower', 'min'], ci),
    q1:     get(['q1'], ci),
    median: get(['median', 'q2', 'p50'], ci),
    q3:     get(['q3'], ci),
    max:    get(['upper', 'max'], ci),
  }))
}

export function buildBoxSpec(C: ChartConfig, rows: BoxRow[], yTitle: string) {
  const values = rows.map(r => ({
    label:       r.label,
    min:         +r.min.toFixed(C.dataLabelDecimals),
    q1:          +r.q1.toFixed(C.dataLabelDecimals),
    median:      +r.median.toFixed(C.dataLabelDecimals),
    q3:          +r.q3.toFixed(C.dataLabelDecimals),
    max:         +r.max.toFixed(C.dataLabelDecimals),
    barColor:    r.color.bg,
    borderColor: r.color.border,
  }))

  const boxDomain = rows.map(r => r.label)
  const xEnc = {
    field: 'label',
    type:  'nominal' as const,
    sort:  C.barSortOrder === 'none' ? null : C.barSortOrder,
    scale: { domain: C.barSortOrder === 'none' ? boxDomain : undefined, paddingInner: C.barPaddingInner, paddingOuter: 0.5 },
    axis:  { labels: false, ticks: false, title: null, domain: C.showXDomain, domainColor: C.axisTickColor, grid: false },
  }

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      C.chartWidth,
    height:     C.chartHeight,
    padding:    { top: C.paddingTop, right: C.paddingRight, bottom: C.paddingBottom, left: C.paddingLeft },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values },
    layer: [
      // Whisker: min → max
      {
        mark: { type: 'rule', strokeWidth: 1.5 },
        encoding: {
          x:      xEnc,
          y:      { field: 'min', type: 'quantitative', scale: { zero: false }, axis: yAxis(C, yTitle) },
          y2:     { field: 'max' },
          stroke: { field: 'borderColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // Box body: q1 → q3
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x:     xEnc,
          y:     { field: 'q1', type: 'quantitative', scale: { zero: false } },
          y2:    { field: 'q3' },
          color: { field: 'barColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // Median tick
      {
        mark: { type: 'tick', thickness: 2, bandSize: C.barWidth },
        encoding: {
          x:     xEnc,
          y:     { field: 'median', type: 'quantitative', scale: { zero: false } },
          color: { field: 'borderColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // Median value label (above box)
      {
        mark: { type: 'text', clip: false, dy: -(C.dataLabelSize / 2 + 4), fontSize: C.dataLabelSize, fontWeight: C.dataLabelWeight, font: C.fontMono, fill: C.dataLabelColor },
        encoding: {
          x:    { field: 'label',  type: 'nominal' },
          y:    { field: 'max',    type: 'quantitative' },
          text: { field: 'median', format: `.${C.dataLabelDecimals}f` },
        },
      },
      // Series label below
      {
        mark: { type: 'text', clip: false, angle: 90, align: 'left', baseline: 'top', dx: C.barLabelPaddingTop, dy: C.barLabelOffsetY, fontSize: C.barLabelSize, fontWeight: C.barLabelWeight, font: C.fontSans, lineBreak: '\n' },
        encoding: {
          x:     xEnc,
          y:     { value: C.chartHeight },
          text:  { field: 'label' },
          color: { field: 'borderColor', type: 'nominal', scale: null, legend: null },
        },
      },
    ],
  }
}

// ── Scatter plot support ──────────────────────────────────────────────────────
// Sheet layout: row 0 = X-axis metric, row 1 = Y-axis metric, columns = models/series.

interface ScatterPoint {
  model:      string
  x:          number
  y:          number
  tag:        string
  labelColor: string
}

/**
 * Build a scatter spec from parsed ASR data.
 * Requires exactly 2 rows: row[0] values → X, row[1] values → Y.
 * Each column (modelDef) becomes one labeled point.
 */
export function buildScatterSpec(C: ChartConfig, parsed: ASRParsed, yTitle: string, flip = false) {
  const { modelDefs, rows } = parsed
  const rowX = flip ? (rows[1] ?? rows[0]) : rows[0]
  const rowY = flip ? rows[0]             : (rows[1] ?? rows[0])
  const xTitle = rowX?.category ?? ''

  const colorScaleDomain = modelDefs.map(d => d.label ?? d.col)
  const colorBgRange     = modelDefs.map((d, i) => (d.color ?? AUTO_COLORS[i % AUTO_COLORS.length]).bg)
  const colorBorderRange = modelDefs.map((d, i) => (d.color ?? AUTO_COLORS[i % AUTO_COLORS.length]).border)

  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')

  const points: ScatterPoint[] = modelDefs.map((d, i) => {
    const xv = rowX?.values[d.col] ?? 0
    const yv = rowY?.values[d.col] ?? 0
    return {
      model:      d.label ?? d.col,
      x:          xv,
      y:          yv,
      tag:        `${fmt(yv)}, ${fmt(xv)}`,
      labelColor: colorBorderRange[i],
    }
  })

  const xAxis = {
    labelColor:      C.axisTickColor,
    labelFontSize:   C.axisTickSize,
    labelFont:       C.fontSans,
    ticks:           false,
    title:           xTitle,
    titleColor:      C.yTitleColor,
    titleFontSize:   C.yTitleSize,
    titleFontWeight: C.yTitleWeight,
    grid:            true,
    gridColor:       C.gridColorY,
  }

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      C.chartWidth,
    height:     C.chartHeight,
    padding:    { top: C.paddingTop, right: C.paddingRight + 8, bottom: C.paddingBottom, left: C.paddingLeft },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values: points },
    layer: [
      {
        mark: { type: 'point', filled: true, size: 80, strokeWidth: 1.5 },
        encoding: {
          x:      { field: 'x', type: 'quantitative', scale: { zero: false }, axis: xAxis },
          y:      { field: 'y', type: 'quantitative', scale: { zero: false }, axis: yAxis(C, yTitle) },
          color:  { field: 'model', type: 'nominal', scale: { domain: colorScaleDomain, range: colorBgRange },     legend: null },
          stroke: { field: 'model', type: 'nominal', scale: { domain: colorScaleDomain, range: colorBorderRange }, legend: null },
        },
      },
      {
        mark: { type: 'text', dy: -20, fontSize: C.barLabelSize, fontWeight: C.barLabelWeight, font: C.fontSans },
        encoding: {
          x:     { field: 'x', type: 'quantitative' },
          y:     { field: 'y', type: 'quantitative' },
          text:  { field: 'model' },
          color: { field: 'labelColor', type: 'nominal', scale: null, legend: null },
        },
      },
      {
        mark: { type: 'text', dy: -8, fontSize: Math.max(C.barLabelSize - 1, 8), fontWeight: 'normal', font: C.fontSans },
        encoding: {
          x:     { field: 'x', type: 'quantitative' },
          y:     { field: 'y', type: 'quantitative' },
          text:  { field: 'tag' },
          color: { field: 'labelColor', type: 'nominal', scale: null, legend: null },
        },
      },
    ],
  }
}

export function buildClusteredSpec(
  C: ChartConfig,
  rows: ClusteredRow[],
  models: string[],
  yTitle: string,
  seriesColors: Record<string, SeriesColor> = {},
) {
  const values: object[] = []
  rows.forEach(row => {
    row.models.forEach((model, mi) => {
      const color = seriesColors[model] ?? AUTO_COLORS[mi % AUTO_COLORS.length]
      values.push({ category: row.category, model, barColor: color.bg, labelColor: color.border, score: +row.values[mi].toFixed(2) })
    })
  })

  const dataMax = Math.max(...values.map(v => (v as { score: number }).score), 0)
  const yDomainMax = dataMax > 0 ? dataMax * (1 + C.yScalePadding / 100) : 1

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      C.clusteredChartWidth,
    height:     C.clusteredChartHeight,
    padding:    { top: C.paddingTop, right: C.paddingRight, bottom: C.paddingBottom, left: C.paddingLeft },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values },
    layer: [
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x:       { field: 'category', type: 'nominal', axis: { labelColor: C.axisTickColor, labelFontSize: C.axisTickSize, labelFont: C.fontSans, ticks: false, domain: C.showXDomain, domainColor: C.axisTickColor, title: null, grid: false }, scale: { paddingInner: C.clusterPaddingInner, ...(C.clusterStep != null ? { step: C.clusterStep } : {}) } },
          xOffset: { field: 'model',    type: 'nominal', scale: { paddingInner: C.barPaddingInner } },
          y:       { field: 'score',    type: 'quantitative', scale: { zero: true, domainMax: yDomainMax }, axis: yAxis(C, yTitle) },
          color:   { field: 'barColor', type: 'nominal', scale: null, legend: null },
        },
      },
      {
        mark: { type: 'text', clip: false, dy: -(C.dataLabelSize / 2 + 4), fontSize: C.dataLabelSize, fontWeight: C.dataLabelWeight, font: C.fontMono, fill: C.dataLabelColor },
        encoding: {
          x:       { field: 'category', type: 'nominal' },
          xOffset: { field: 'model',    type: 'nominal' },
          y:       { field: 'score',    type: 'quantitative' },
          text:    { field: 'score',    format: `.${C.dataLabelDecimals}f` },
        },
      },
      {
        mark: { type: 'text', clip: false, angle: 90, align: 'left', baseline: 'top', dx: C.barLabelPaddingTop, dy: C.barLabelOffsetY, fontSize: C.barLabelSize, fontWeight: C.barLabelWeight, font: C.fontSans, lineBreak: '\n' },
        encoding: {
          x:       { field: 'category', type: 'nominal' },
          xOffset: { field: 'model',    type: 'nominal' },
          y:       { value: C.clusteredChartHeight },
          text:    { field: 'model' },
          color:   { field: 'labelColor', type: 'nominal', scale: null, legend: null },
        },
      },
    ],
  }
}

// ── Spec → SVG ────────────────────────────────────────────────────────────────

export async function specToSvg(spec: object): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vegaSpec = compile(spec as any).spec
  const view     = new vega.View(vega.parse(vegaSpec), { renderer: 'none' })
  return view.toSVG()
}

// ── Wrap chart SVG in card header ─────────────────────────────────────────────

export function wrapAsSvg(
  C: ChartConfig,
  chartSvg: string,
  opts: { tag: string; category: string; dialect: string; count?: number; fixedWidth?: number | null; fixedHeight?: number | null },
): string {
  const { tag, count, fixedWidth = null, fixedHeight = null } = opts
  const headerHeight = C.cardHeaderHeight

  // Auto-split title: if no explicit dialect and category contains ' - ',
  // split into line1 (before) and line2 (after). Otherwise use as-is.
  let line1 = opts.category
  let line2 = opts.dialect
  if (!line2 && opts.category.includes(' - ')) {
    const idx = opts.category.indexOf(' - ')
    line1 = opts.category.slice(0, idx)
    line2 = opts.category.slice(idx + 3)
  }

  const wMatch   = chartSvg.match(/\bwidth="([\d.]+)"/)
  const hMatch   = chartSvg.match(/\bheight="([\d.]+)"/)
  const naturalW = wMatch ? parseFloat(wMatch[1]) : 500
  const naturalH = hMatch ? parseFloat(hMatch[1]) : 400
  const w        = fixedWidth  ?? naturalW
  const h        = fixedHeight ?? naturalH
  const totalH   = h + headerHeight

  const viewBox     = `viewBox="0 0 ${naturalW} ${naturalH}"`
  const innerResized = chartSvg
    .replace(/\bwidth="[\d.]+"/, `width="${w}"`)
    .replace(/\bheight="[\d.]+"/, `height="${h}"`)
    .replace(/^<svg /,  (m) => (/\bviewBox=/.test(chartSvg) ? m : `<svg ${viewBox} `))
    .replace(/^<svg /,  `<svg y="${headerHeight}" `)

  const line1Y = C.cardLine1Y
  const tagY   = line1Y
  const line2Y = line1Y + C.cardCategorySize + C.cardLineGap

  const nLabel = C.showN && count != null && count > 0
    ? `<text x="${w - 10}" y="${totalH - 10}" text-anchor="end" font-family="${C.fontMono}" font-size="${C.nLabelSize}" fill="${C.nLabelColor}">n=${count}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}">
  <rect width="${w}" height="${totalH}" fill="${C.cardBg}" />
  <text x="${w - C.cardHeaderPaddingX}" y="${tagY}" text-anchor="end" font-family="${C.fontSans}" font-size="${C.cardTagSize}" font-weight="${C.cardTagWeight}" fill="${C.cardTagColor}">${tag}</text>
  <text x="${C.cardHeaderPaddingX}" y="${line1Y}" font-family="${C.fontSans}" font-size="${C.cardCategorySize}" font-weight="${C.cardCategoryWeight}" fill="${C.cardCategoryColor}">${line1}</text>
  ${line2 ? `<text x="${C.cardHeaderPaddingX}" y="${line2Y}" font-family="${C.fontSans}" font-size="${C.cardDialectSize}" font-weight="${C.cardDialectWeight}" fill="${C.cardDialectColor}">${line2}</text>` : ''}
  ${innerResized}
  ${nLabel}
</svg>`
}

// ── Layout diagram ────────────────────────────────────────────────────────────

export function buildTemplateDiagramSvg(C: ChartConfig): string {
  const HEADER_H_VAL = C.cardHeaderHeight
  const cardNatW = C.svgWidth  ?? (C.chartWidth  + C.paddingLeft + C.paddingRight)
  const cardNatH = C.svgHeight ?? (HEADER_H_VAL  + C.paddingTop  + C.chartHeight  + C.paddingBottom)

  const sc  = Math.min(750 / cardNatW, 440 / cardNatH, 2.5)
  const fn  = (n: number) => String(Math.round(n * 10) / 10)
  const s   = (v: number) => v * sc
  const sW  = s(cardNatW)
  const sH  = s(cardNatH)

  const ML = 20, MT = 36, MR = 210, MB = 80
  const TOTAL_W = Math.ceil(ML + sW + MR)
  const TOTAL_H = Math.ceil(MT + sH + MB)

  const CX   = ML, CY = MT
  const hdrH = s(HEADER_H_VAL)
  const padT = s(C.paddingTop)
  const padB = s(C.paddingBottom)
  const padL = s(C.paddingLeft)
  const padR = s(C.paddingRight)
  const pltW = s(C.chartWidth)
  const pltH = s(C.chartHeight)
  const pltX = CX + padL
  const pltY = CY + hdrH + padT

  // Mock bars: 2 groups × 2 bars
  const nG = 2, nB = 2
  const rawGStep = C.clusterStep != null ? s(C.clusterStep) : pltW / nG
  const gStep = Math.min(rawGStep, pltW)
  const gGap  = gStep * C.clusterPaddingInner
  const gInW  = gStep - gGap
  const bSlot = gInW / nB
  const bW    = Math.max(3, Math.min(s(C.barWidth), bSlot * (1 - C.barPaddingInner)))
  const BHS   = [[pltH * 0.55, pltH * 0.75], [pltH * 0.40, pltH * 0.62]]
  const BC    = ['rgba(189,228,202,0.9)', 'rgba(179,211,255,0.9)']

  const barsSvg: string[] = []
  for (let g = 0; g < nG; g++) {
    for (let b = 0; b < nB; b++) {
      const bx = pltX + g * gStep + gGap / 2 + b * bSlot + (bSlot - bW) / 2
      const bh = BHS[g][b]
      barsSvg.push(`  <rect x="${fn(bx)}" y="${fn(pltY + pltH - bh)}" width="${fn(bW)}" height="${fn(bh)}" fill="${BC[b]}" rx="1"/>`)
    }
  }

  const DC = '#2563EB', LC = '#1e40af'
  const MF = `font-family="ui-monospace,monospace" font-size="9.5" fill="${LC}"`

  function hdim(x1: number, x2: number, y: number, label: string, labelOff = 12): string {
    const mid = (x1 + x2) / 2
    const rows: string[] = []
    if (Math.abs(x2 - x1) >= 8) {
      rows.push(
        `  <line x1="${fn(x1)}" y1="${fn(y)}" x2="${fn(x2)}" y2="${fn(y)}" stroke="${DC}" stroke-width="1"/>`,
        `  <line x1="${fn(x1)}" y1="${fn(y - 4)}" x2="${fn(x1)}" y2="${fn(y + 4)}" stroke="${DC}" stroke-width="1"/>`,
        `  <line x1="${fn(x2)}" y1="${fn(y - 4)}" x2="${fn(x2)}" y2="${fn(y + 4)}" stroke="${DC}" stroke-width="1"/>`,
      )
    }
    rows.push(`  <text x="${fn(mid)}" y="${fn(y + labelOff)}" text-anchor="middle" ${MF}>${label}</text>`)
    return rows.join('\n')
  }

  function vdim(x: number, y1: number, y2: number, label: string, lxOffset = 8): string {
    const mid = (y1 + y2) / 2
    const rows: string[] = []
    if (Math.abs(y2 - y1) >= 6) {
      rows.push(
        `  <line x1="${fn(x)}" y1="${fn(y1)}" x2="${fn(x)}" y2="${fn(y2)}" stroke="${DC}" stroke-width="1"/>`,
        `  <line x1="${fn(x - 4)}" y1="${fn(y1)}" x2="${fn(x + 4)}" y2="${fn(y1)}" stroke="${DC}" stroke-width="1"/>`,
        `  <line x1="${fn(x - 4)}" y1="${fn(y2)}" x2="${fn(x + 4)}" y2="${fn(y2)}" stroke="${DC}" stroke-width="1"/>`,
      )
    }
    rows.push(`  <text x="${fn(x + lxOffset)}" y="${fn(mid + 3)}" dominant-baseline="middle" ${MF}>${label}</text>`)
    return rows.join('\n')
  }

  const dimsSvg: string[] = []

  // Horizontal dims below card
  const yH1 = CY + sH + 14
  const yH2 = CY + sH + 30
  dimsSvg.push(hdim(CX, CX + sW, yH1, `SVG card width: ${C.svgWidth != null ? C.svgWidth : `auto → ${Math.round(cardNatW)}`}`))
  dimsSvg.push(hdim(pltX, pltX + pltW, yH2, `Chart width: ${C.chartWidth}`))
  if (padL >= 2) dimsSvg.push(hdim(CX, pltX,             yH2, `Padding left: ${C.paddingLeft}`))
  if (padR >= 2) dimsSvg.push(hdim(pltX + pltW, CX + sW, yH2, `Padding right: ${C.paddingRight}`))

  // Vertical dims right of card
  const xV0 = CX + sW + 12
  const xV1 = CX + sW + 70
  dimsSvg.push(vdim(xV0, CY, CY + sH, `SVG card height: ${C.svgHeight != null ? C.svgHeight : `auto → ${Math.round(cardNatH)}`}`))
  dimsSvg.push(vdim(xV1, CY, CY + hdrH, `Card header height: ${C.cardHeaderHeight}`))
  if (padT >= 2) dimsSvg.push(vdim(xV1, CY + hdrH, pltY,      `Padding top: ${C.paddingTop}`))
  dimsSvg.push(   vdim(xV1, pltY, pltY + pltH,                 `Chart height: ${C.chartHeight}`))
  if (padB >= 2) dimsSvg.push(vdim(xV1, pltY + pltH, CY + sH, `Padding bottom: ${C.paddingBottom}`))

  // Bar-level dims below plot
  const g0start    = pltX + gGap / 2
  const barDetailY = pltY + pltH + 8
  dimsSvg.push(hdim(g0start, g0start + gStep, barDetailY,
    C.clusterStep != null ? `Group step px: ${C.clusterStep}` : `Group step px: auto (≈${Math.round(gStep / sc)})`))

  const b0x = g0start + (bSlot - bW) / 2
  dimsSvg.push(hdim(b0x, b0x + bW, barDetailY + 18, `Bar width: ${C.barWidth}`))

  // gap between groups
  const gapL = pltX + gInW + gGap / 2
  const gapR = pltX + gStep + gGap / 2
  if (gapR - gapL > 3) dimsSvg.push(hdim(gapL, gapR, barDetailY + 18, `Group gap 0–1: ${C.clusterPaddingInner}`))

  // gap between bars within group
  const bar0R = b0x + bW
  const bar1L = g0start + bSlot + (bSlot - bW) / 2
  if (bar1L - bar0R > 3) dimsSvg.push(hdim(bar0R, bar1L, barDetailY + 36, `Bar gap within group 0–1: ${C.barPaddingInner}`))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TOTAL_W}" height="${TOTAL_H}">
  <rect width="${TOTAL_W}" height="${TOTAL_H}" fill="#F7F7FB"/>
  <text x="${CX}" y="${MT - 12}" font-size="11" font-weight="600" fill="#52616F" font-family="ui-sans-serif,sans-serif">Layout Diagram</text>
  <!-- Card bg -->
  <rect x="${fn(CX)}" y="${fn(CY)}" width="${fn(sW)}" height="${fn(sH)}" fill="white" stroke="#D1D5DB" stroke-width="1"/>
  <!-- Header zone -->
  <rect x="${fn(CX)}" y="${fn(CY)}" width="${fn(sW)}" height="${fn(hdrH)}" fill="rgba(254,243,199,0.85)"/>
  <text x="${fn(CX + sW / 2)}" y="${fn(CY + hdrH / 2 + 4)}" text-anchor="middle" font-size="9" font-family="ui-sans-serif,sans-serif" fill="#92400E">card header</text>
  <!-- Padding zones -->
  ${padT > 0 ? `<rect x="${fn(pltX)}" y="${fn(CY + hdrH)}" width="${fn(pltW)}" height="${fn(padT)}" fill="rgba(219,234,254,0.7)"/>` : ''}
  ${padB > 0 ? `<rect x="${fn(pltX)}" y="${fn(pltY + pltH)}" width="${fn(pltW)}" height="${fn(padB)}" fill="rgba(219,234,254,0.7)"/>` : ''}
  ${padL > 0 ? `<rect x="${fn(CX)}" y="${fn(CY + hdrH)}" width="${fn(padL)}" height="${fn(pltH + padT + padB)}" fill="rgba(219,234,254,0.7)"/>` : ''}
  ${padR > 0 ? `<rect x="${fn(pltX + pltW)}" y="${fn(CY + hdrH)}" width="${fn(padR)}" height="${fn(pltH + padT + padB)}" fill="rgba(219,234,254,0.7)"/>` : ''}
  <!-- Plot area -->
  <rect x="${fn(pltX)}" y="${fn(pltY)}" width="${fn(pltW)}" height="${fn(pltH)}" fill="white" stroke="#E5E7EB" stroke-width="0.5"/>
  <!-- Grid lines -->
  <line x1="${fn(pltX)}" y1="${fn(pltY + pltH * 0.25)}" x2="${fn(pltX + pltW)}" y2="${fn(pltY + pltH * 0.25)}" stroke="#F3F4F6" stroke-width="1"/>
  <line x1="${fn(pltX)}" y1="${fn(pltY + pltH * 0.50)}" x2="${fn(pltX + pltW)}" y2="${fn(pltY + pltH * 0.50)}" stroke="#F3F4F6" stroke-width="1"/>
  <line x1="${fn(pltX)}" y1="${fn(pltY + pltH * 0.75)}" x2="${fn(pltX + pltW)}" y2="${fn(pltY + pltH * 0.75)}" stroke="#F3F4F6" stroke-width="1"/>
  <!-- Mock bars -->
${barsSvg.join('\n')}
  <!-- Axis line -->
  <line x1="${fn(pltX)}" y1="${fn(pltY + pltH)}" x2="${fn(pltX + pltW)}" y2="${fn(pltY + pltH)}" stroke="#a0a0b8" stroke-width="1"/>
  <!-- Card border on top -->
  <rect x="${fn(CX)}" y="${fn(CY)}" width="${fn(sW)}" height="${fn(sH)}" fill="none" stroke="#9CA3AF" stroke-width="1"/>
  <!-- Dimension annotations -->
${dimsSvg.join('\n')}
</svg>`
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function cardLabel(tag: string, category: string, dialect?: string) {
  return dialect ? `${category} — ${dialect}` : category
}

// ── Main generate function ────────────────────────────────────────────────────
// Takes datasets+config, file buffers keyed by dataset id, returns GeneratedCard[].

export interface FileBuffers {
  // key: dataset.id  →  value: Buffer of the xlsx/csv file contents
  [datasetId: string]: Buffer
}

export async function generateCards(
  datasets: import('./types').Dataset[],
  config:   ChartConfig,
  files:    FileBuffers,
): Promise<GeneratedCard[]> {
  const cards: GeneratedCard[] = []
  let cardIndex = 0

  // Prepend layout diagram as card 0 when enabled
  if (config.showLayoutDiagram) {
    cards.push({ id: 'layout_diagram', svgData: buildTemplateDiagramSvg(config), label: 'Layout Diagram' })
  }

  for (const dataset of datasets) {

    if (dataset.type === 'asr') {
      const buf = files[dataset.id]
      if (!buf) throw new Error(`No file uploaded for dataset "${dataset.id}"`)

      for (const metric of dataset.metrics) {
        const { label: metricLabel, fileKey, chartType = 'bar' } = metric

        if (metric.modelDefs) {
          // ── Direct mode: fileKey IS the sheet name ─────────────────────────
          const csv         = xlsxSheetToCsv(buf, fileKey)
          const pivot       = metric.pivot ?? false
          const splitBy     = metric.splitBy ?? 'none'
          const metricConfig = metric.showClusterLabels !== undefined
            ? { ...config, showClusterLabels: metric.showClusterLabels }
            : config

          if (chartType === 'scatter') {
            const parsed     = parseASRCsv(csv, metric.modelDefs)
            const chartSvg   = await specToSvg(buildScatterSpec(metricConfig, parsed, dataset.yTitle, metric.pivot ?? false))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag: dataset.tag, category: metricLabel, dialect: '',
              fixedWidth: config.svgWidth, fixedHeight: config.svgHeight,
            })
            cards.push({ id: `${dataset.id}_${slug(metricLabel)}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, metricLabel) })

          } else if (chartType === 'box') {
            const chartSvg   = await specToSvg(buildBoxSpec(metricConfig, parseBoxCsv(csv, metric.modelDefs), dataset.yTitle))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag: dataset.tag, category: metricLabel, dialect: '',
              fixedWidth: config.svgWidth, fixedHeight: config.svgHeight,
            })
            cards.push({ id: `${dataset.id}_${slug(metricLabel)}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, metricLabel) })

          } else if (splitBy === 'row') {
            // one card per data row — each shows all models for that row
            const parsed = parseASRCsv(csv, metric.modelDefs)
            for (const row of parsed.rows) {
              const spec       = buildASRSpec(metricConfig, { modelDefs: parsed.modelDefs, rows: [row] }, dataset.yTitle, false, true)
              const chartSvg   = await specToSvg(spec)
              const wrappedSvg = wrapAsSvg(config, chartSvg, {
                tag: dataset.tag, category: metricLabel, dialect: row.category,
                count: row.count, fixedWidth: config.svgWidth, fixedHeight: config.svgHeight,
              })
              cards.push({ id: `${dataset.id}_${slug(metricLabel)}_${slug(row.category)}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, metricLabel, row.category) })
            }

          } else if (splitBy === 'column') {
            // one card per model column — each shows all rows for that model
            const parsed = parseASRCsv(csv, metric.modelDefs)
            for (const def of parsed.modelDefs) {
              const colLabel   = def.label ?? def.col
              const spec       = buildASRSpec(metricConfig, { modelDefs: [def], rows: parsed.rows }, dataset.yTitle)
              const chartSvg   = await specToSvg(spec)
              const wrappedSvg = wrapAsSvg(config, chartSvg, {
                tag: dataset.tag, category: metricLabel, dialect: colLabel,
                fixedWidth: config.svgWidth, fixedHeight: config.svgHeight,
              })
              cards.push({ id: `${dataset.id}_${slug(metricLabel)}_${slug(colLabel)}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, metricLabel, colLabel) })
            }

          } else {
            // one card, optionally pivoted
            const parsed     = parseASRCsv(csv, metric.modelDefs)
            const chartSvg   = await specToSvg(buildASRSpec(metricConfig, parsed, dataset.yTitle, pivot))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag: dataset.tag, category: metricLabel, dialect: '',
              fixedWidth: config.svgWidth, fixedHeight: config.svgHeight,
            })
            cards.push({ id: `${dataset.id}_${slug(metricLabel)}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, metricLabel) })
          }
          continue
        }

        // ── Group mode (legacy / manual JSON): one card per group ────────────
        const groupNames = Object.keys(dataset.groups)

        const getSheetCsv = (group: string) => {
          if (dataset.source === 'xlsx') {
            const sheetName = (dataset.sheetPattern ?? '{group} - {fileKey}')
              .replace('{group}', group)
              .replace('{fileKey}', fileKey)
            return xlsxSheetToCsv(buf, sheetName)
          }
          return buf.toString('utf-8')
        }

        if (chartType === 'box') {
          // One card per group — all rows in the sheet become box series
          for (const group of groupNames) {
            const rows = parseBoxCsv(getSheetCsv(group))
            const chartSvg   = await specToSvg(buildBoxSpec(config, rows, dataset.yTitle))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag:        dataset.tag,
              category:   metricLabel,
              dialect:    group,
              fixedWidth: config.svgWidth,
              fixedHeight: config.svgHeight,
            })
            cards.push({
              id:      `${dataset.id}_${slug(metricLabel)}_${slug(group)}_${cardIndex++}`,
              svgData: wrappedSvg,
              label:   cardLabel(dataset.tag, metricLabel, group),
            })
          }

        } else {
          // Bar: one card per group — all category rows become grouped bars
          for (const group of groupNames) {
            const parsed     = parseASRCsv(getSheetCsv(group), dataset.groups[group])
            const chartSvg   = await specToSvg(buildASRSpec(config, parsed, dataset.yTitle))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag:         dataset.tag,
              category:    metricLabel,
              dialect:     group,
              fixedWidth:  config.svgWidth,
              fixedHeight: config.svgHeight,
            })
            cards.push({
              id:      `${dataset.id}_${slug(metricLabel)}_${slug(group)}_${cardIndex++}`,
              svgData: wrappedSvg,
              label:   cardLabel(dataset.tag, metricLabel, group),
            })
          }
        }
      }

    } else if (dataset.type === 'clustered') {
      const buf = files[dataset.id]
      if (!buf) throw new Error(`No file uploaded for dataset "${dataset.id}"`)

      let csv: string
      if (dataset.source === 'xlsx') {
        csv = xlsxSheetToCsv(buf, dataset.sheet ?? '')
      } else {
        csv = buf.toString('utf-8')
      }

      const rows   = parseClusteredCsv(csv)
      const models = rows[0]?.models ?? []
      const chartSvg   = await specToSvg(buildClusteredSpec(config, rows, models, dataset.yTitle, dataset.seriesColors ?? {}))
      const wrappedSvg = wrapAsSvg(config, chartSvg, {
        tag:         dataset.tag,
        category:    dataset.sectionTitle,
        dialect:     '',
        fixedWidth:  config.svgClusteredWidth,
        fixedHeight: config.svgClusteredHeight,
      })
      cards.push({ id: `${dataset.id}_${cardIndex++}`, svgData: wrappedSvg, label: cardLabel(dataset.tag, dataset.sectionTitle ?? '') })
    }
  }

  return cards
}
