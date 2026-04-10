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

export function parseASRCsv(content: string, modelDefs: ModelDef[]): ASRParsed {
  const lines   = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const headers = lines[0].split(',')
  const rows: ASRRow[] = lines.slice(1).map(line => {
    const cols  = line.split(',')
    const entry: ASRRow = { category: cols[0], values: {}, count: parseInt(cols[cols.length - 1]) || 0 }
    headers.slice(1).forEach((h, i) => { entry.values[h] = parseFloat(cols[i + 1]) })
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

export function xlsxSheetToCsv(buffer: Buffer, sheetName: string): string {
  const wb = xlsxRead(buffer, { type: 'buffer' })
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" not found. Available: ${wb.SheetNames.join(', ')}`)
  return xlsxUtils.sheet_to_csv(ws)
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

export function buildASRSpec(C: ChartConfig, modelDefs: ModelDef[], row: ASRRow, yTitle: string) {
  const values = modelDefs.map(({ col, label, color }, i) => {
    const c = color ?? AUTO_COLORS[i % AUTO_COLORS.length]
    return {
      model:      label ?? col,
      barColor:   c.bg,
      labelColor: c.border,
      wer:        +(row.values[col] ?? 0).toFixed(C.dataLabelDecimals),
    }
  })

  const xAxisHidden = {
    labels: false, ticks: false, title: null,
    domain: true, domainColor: C.axisTickColor, grid: false,
  }

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      C.chartWidth,
    height:     C.chartHeight,
    padding:    { top: C.paddingTop, right: 16, bottom: C.paddingBottom, left: 8 },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values },
    layer: [
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x: { field: 'model', type: 'nominal', scale: { paddingInner: C.barPaddingInner, paddingOuter: 0.5 }, axis: xAxisHidden },
          y: { field: 'wer', type: 'quantitative', scale: { zero: true }, axis: yAxis(C, yTitle) },
          color: { field: 'barColor', type: 'nominal', scale: null, legend: null },
        },
      },
      {
        mark: { type: 'text', clip: false, dy: -(C.dataLabelSize / 2 + 4), fontSize: C.dataLabelSize, fontWeight: C.dataLabelWeight, font: C.fontMono, fill: C.dataLabelColor },
        encoding: {
          x:    { field: 'model', type: 'nominal' },
          y:    { field: 'wer',   type: 'quantitative' },
          text: { field: 'wer',   format: `.${C.dataLabelDecimals}f` },
        },
      },
      {
        mark: { type: 'text', clip: false, angle: 90, align: 'left', baseline: 'top', dx: C.barLabelPaddingTop, dy: C.barLabelOffsetY, fontSize: C.barLabelSize, fontWeight: C.barLabelWeight, font: C.fontSans, lineBreak: '\n' },
        encoding: {
          x:     { field: 'model', type: 'nominal' },
          y:     { value: C.chartHeight },
          text:  { field: 'model' },
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

  return {
    $schema:    'https://vega.github.io/schema/vega-lite/v5.json',
    width:      C.clusteredChartWidth,
    height:     C.clusteredChartHeight,
    padding:    { top: C.paddingTop, right: 16, bottom: C.paddingBottom, left: 8 },
    background: 'transparent',
    config:     { view: { stroke: null } },
    data:       { values },
    layer: [
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x:       { field: 'category', type: 'nominal', axis: { labelColor: C.axisTickColor, labelFontSize: C.axisTickSize, labelFont: C.fontSans, ticks: false, domain: true, domainColor: C.axisTickColor, title: null, grid: false } },
          xOffset: { field: 'model',    type: 'nominal', scale: { paddingInner: C.barPaddingInner } },
          y:       { field: 'score',    type: 'quantitative', scale: { zero: true }, axis: yAxis(C, yTitle) },
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
  opts: { tag: string; category: string; dialect: string; headerHeight?: number; fixedWidth?: number | null; fixedHeight?: number | null },
): string {
  const { tag, category, dialect, headerHeight = 72, fixedWidth = null, fixedHeight = null } = opts

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

  const catY     = 36
  const tagY     = catY
  const dialectY = 58

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}">
  <rect width="${w}" height="${totalH}" fill="${C.cardBg}" />
  <text x="${w - 14}" y="${tagY}" text-anchor="end" font-family="${C.fontSans}" font-size="${C.cardTagSize}" font-weight="${C.cardTagWeight}" fill="${C.cardTagColor}">${tag}</text>
  <text x="14" y="${catY}" font-family="${C.fontSans}" font-size="${C.cardCategorySize}" font-weight="${C.cardCategoryWeight}" fill="${C.cardCategoryColor}">${category}</text>
  ${dialect ? `<text x="14" y="${dialectY}" font-family="${C.fontSans}" font-size="${C.cardDialectSize}" font-weight="${C.cardDialectWeight}" fill="${C.cardDialectColor}">${dialect}</text>` : ''}
  ${innerResized}
</svg>`
}

// ── Slug helper ───────────────────────────────────────────────────────────────

export function slug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
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

  for (const dataset of datasets) {

    if (dataset.type === 'asr') {
      const groupNames = Object.keys(dataset.groups)
      const buf = files[dataset.id]
      if (!buf) throw new Error(`No file uploaded for dataset "${dataset.id}"`)

      // Load all sheets/csvs
      const data: Record<string, Record<string, ASRParsed>> = {}
      for (const group of groupNames) {
        data[group] = {}
        for (const { label, fileKey } of dataset.metrics) {
          let csv: string
          if (dataset.source === 'xlsx') {
            const sheetName = (dataset.sheetPattern ?? '{group} - {fileKey}')
              .replace('{group}', group)
              .replace('{fileKey}', fileKey)
            csv = xlsxSheetToCsv(buf, sheetName)
          } else {
            csv = buf.toString('utf-8')
          }
          data[group][label] = parseASRCsv(csv, dataset.groups[group])
        }
      }

      for (const { label: metricLabel } of dataset.metrics) {
        const allCategories = [...new Map(
          groupNames.flatMap(g => data[g][metricLabel].rows.map(r => [r.category, true] as [string, boolean]))
        ).keys()]

        for (const category of allCategories) {
          for (const group of groupNames) {
            const parsed  = data[group][metricLabel]
            const rowData = parsed.rows.find(r => r.category === category)
            if (!rowData) continue

            const chartSvg  = await specToSvg(buildASRSpec(config, parsed.modelDefs, rowData, dataset.yTitle))
            const wrappedSvg = wrapAsSvg(config, chartSvg, {
              tag:         dataset.tag,
              category:    `${metricLabel}: ${category}`,
              dialect:     group,
              fixedWidth:  config.svgWidth,
              fixedHeight: config.svgHeight,
            })
            cards.push({
              id:      `${dataset.id}_${slug(metricLabel)}_${slug(category)}_${slug(group)}`,
              svgData: wrappedSvg,
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
      cards.push({ id: dataset.id, svgData: wrappedSvg })
    }
  }

  return cards
}
