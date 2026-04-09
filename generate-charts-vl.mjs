/**
 * generate-charts-vl.mjs
 * Generates charts.html from CSV data using Vega-Lite (server-side SVG rendering).
 * Output SVGs contain real <text> and <rect> elements — fully editable in Figma.
 *
 * Usage: node generate-charts-vl.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname }               from 'path'
import { fileURLToPath }               from 'url'
import { compile }                     from 'vega-lite'
import * as vega                       from 'vega'
import { modelChartColor, LLM_COLORS } from './colors.mjs'
import { CHART_CONFIG as C }           from './chart-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir   = join(__dirname, 'data')

// ── Dialect → model column mappings ─────────────────────────────────────────
const DIALECT_MODELS = {
  Chami: [
    { col: 'google1', label: 'Google'  },
    { col: 'aws',     label: 'AWS'     },
    { col: 'azure1',  label: 'Azure'   },
    { col: 'whisper', label: 'Whisper' },
  ],
  Egyptian: [
    { col: 'google',  label: 'Google'  },
    { col: 'aws',     label: 'AWS'     },
    { col: 'azure',   label: 'Azure'   },
    { col: 'whisper', label: 'Whisper' },
  ],
  Hijazi: [
    { col: 'aws',     label: 'AWS'     },
    { col: 'azure',   label: 'Azure'   },
    { col: 'whisper', label: 'Whisper' },
  ],
  Najdi: [
    { col: 'google',  label: 'Google'  },
    { col: 'aws',     label: 'AWS'     },
    { col: 'azure',   label: 'Azure'   },
    { col: 'whisper', label: 'Whisper' },
  ],
}

// ── CSV parsers ──────────────────────────────────────────────────────────────
function parseASRCsv(content, dialect) {
  const lines    = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const headers  = lines[0].split(',')
  const modelDefs = DIALECT_MODELS[dialect]
  const rows = lines.slice(1).map(line => {
    const cols  = line.split(',')
    const entry = { category: cols[0], values: {}, count: parseInt(cols[cols.length - 1]) || 0 }
    headers.slice(1).forEach((h, i) => { entry.values[h] = parseFloat(cols[i + 1]) })
    return entry
  })
  return { modelDefs, rows }
}

function parseAxisCsv(content) {
  const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows  = []
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

// ── Load data ────────────────────────────────────────────────────────────────
const dialects = ['Chami', 'Egyptian', 'Hijazi', 'Najdi']
const METRICS  = [
  { label: 'Speaker Age',         fileKey: 'Age'                 },
  { label: 'Speaker Gender',      fileKey: 'Gender'              },
  { label: 'Segment Environment', fileKey: 'segment environment' },
]

const asrData = {}
for (const dialect of dialects) {
  asrData[dialect] = {}
  for (const { label, fileKey } of METRICS) {
    const raw = readFileSync(join(dataDir, `Arabic ASR-full_${dialect} - ${fileKey}.csv`), 'utf-8')
    asrData[dialect][label] = parseASRCsv(raw, dialect)
  }
}

const axisRaw  = readFileSync(join(dataDir, 'axis', 'Arabic LLM Evaluation - Sheet11.csv'), 'utf-8')
const axisRows = parseAxisCsv(axisRaw)
const llmModels = axisRows[0]?.models ?? []

// ── Shared axis config helpers ───────────────────────────────────────────────
const yAxis = (title) => ({
  labelColor:     C.axisTickColor,
  labelFontSize:  C.axisTickSize,
  labelFont:      C.fontMono,
  tickColor:      C.axisTickColor,
  domainColor:    C.axisTickColor,
  title,
  titleColor:     C.yTitleColor,
  titleFontSize:  C.yTitleSize,
  titleFont:      C.fontSans,
  gridColor:      C.gridColorY,
  tickCount:      5,
})

const xAxisHidden = {
  labels: false, ticks: false, title: null,
  domain: true, domainColor: C.axisTickColor, grid: false,
}

// ── ASR single-group spec (one category × one dialect) ───────────────────────
function buildASRSpec(modelDefs, rowData) {
  const values = modelDefs.map(({ col, label }) => ({
    model:      label,
    barColor:   modelChartColor(label).bg,
    labelColor: modelChartColor(label).border,
    wer:        +(rowData.values[col] ?? 0).toFixed(C.dataLabelDecimals),
  }))

  const domain      = modelDefs.map(d => d.label)
  const barColors   = domain.map(l => modelChartColor(l).bg)
  const labelColors = domain.map(l => modelChartColor(l).border)

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width:   C.chartWidth,
    height:  C.chartHeight,
    padding: { top: C.paddingTop, right: 16, bottom: C.paddingBottom, left: 8 },
    background: 'transparent',
    config: { view: { stroke: null } },
    data: { values },
    layer: [
      // ① Bars
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x: {
            field: 'model', type: 'nominal',
            scale: { paddingInner: C.barPaddingInner, paddingOuter: 0.5 },
            axis: xAxisHidden,
          },
          y: {
            field: 'wer', type: 'quantitative',
            scale: { zero: true },
            axis: yAxis('WER (%)'),
          },
          color: { field: 'barColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // ② Value labels above bars
      {
        mark: {
          type: 'text', clip: false,
          dy:         -(C.dataLabelSize / 2 + 4),
          fontSize:     C.dataLabelSize,
          fontWeight:   C.dataLabelWeight,
          font:         C.fontMono,
          fill:         C.dataLabelColor,
        },
        encoding: {
          x:    { field: 'model', type: 'nominal' },
          y:    { field: 'wer',   type: 'quantitative' },
          text: { field: 'wer',   format: `.${C.dataLabelDecimals}f` },
        },
      },
      // ③ Rotated model name labels (drawn below x-axis into bottom padding)
      {
        mark: {
          type: 'text', clip: false,
          angle:      90,
          align:      'left',
          baseline:   'top',
          dx:          C.barLabelPaddingTop,
          dy:          C.barLabelOffsetY,
          fontSize:    C.barLabelSize,
          fontWeight:  C.barLabelWeight,
          font:        C.fontSans,
        },
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

// ── LLM grouped-bar spec ─────────────────────────────────────────────────────
function buildLLMSpec() {
  const values = []
  axisRows.forEach(row => {
    row.models.forEach((model, mi) => {
      values.push({
        category:   row.category,
        model,
        barColor:   LLM_COLORS[mi] ? `rgba(${LLM_COLORS[mi].rgb},${C.barAlpha})` : 'rgba(200,200,200,0.7)',
        labelColor: LLM_COLORS[mi]?.hex ?? '#aaa',
        score:      +row.values[mi].toFixed(2),
      })
    })
  })

  const domain      = llmModels
  const barColors   = domain.map((_, i) => LLM_COLORS[i] ? `rgba(${LLM_COLORS[i].rgb},${C.barAlpha})` : 'rgba(200,200,200,0.7)')
  const labelColors = domain.map((_, i) => LLM_COLORS[i]?.hex ?? '#aaa')

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    width:   C.llmChartWidth,
    height:  C.llmChartHeight,
    padding: { top: C.paddingTop, right: 16, bottom: C.paddingBottom, left: 8 },
    background: 'transparent',
    config: { view: { stroke: null } },
    data: { values },
    layer: [
      // ① Grouped bars
      {
        mark: { type: 'bar', width: C.barWidth, cornerRadius: C.barBorderRadius, strokeWidth: C.barBorderWidth },
        encoding: {
          x: {
            field: 'category', type: 'nominal',
            axis: {
              labelColor: C.axisTickColor, labelFontSize: C.axisTickSize, labelFont: C.fontSans,
              ticks: false, domain: true, domainColor: C.axisTickColor, title: null, grid: false,
            },
          },
          xOffset: {
            field: 'model', type: 'nominal',
            scale: { paddingInner: C.barPaddingInner },
          },
          y: {
            field: 'score', type: 'quantitative',
            scale: { zero: true },
            axis: yAxis('Score'),
          },
          color: { field: 'barColor', type: 'nominal', scale: null, legend: null },
        },
      },
      // ② Value labels above bars
      {
        mark: {
          type: 'text', clip: false,
          dy:         -(C.dataLabelSize / 2 + 4),
          fontSize:     C.dataLabelSize,
          fontWeight:   C.dataLabelWeight,
          font:         C.fontMono,
          fill:         C.dataLabelColor,
        },
        encoding: {
          x:       { field: 'category', type: 'nominal' },
          xOffset: { field: 'model',    type: 'nominal' },
          y:       { field: 'score',    type: 'quantitative' },
          text:    { field: 'score',    format: '.2f' },
        },
      },
      // ③ Rotated model labels below each bar group
      {
        mark: {
          type: 'text', clip: false,
          angle:      90,
          align:      'left',
          baseline:   'top',
          dx:          C.barLabelPaddingTop,
          dy:          C.barLabelOffsetY,
          fontSize:    C.barLabelSize,
          fontWeight:  C.barLabelWeight,
          font:        C.fontSans,
        },
        encoding: {
          x:       { field: 'category', type: 'nominal' },
          xOffset: { field: 'model',    type: 'nominal' },
          y:       { value: C.llmChartHeight },
          text:    { field: 'model' },
          color: { field: 'labelColor', type: 'nominal', scale: null, legend: null },
        },
      },
    ],
  }
}

// ── Render Vega-Lite spec → SVG string ───────────────────────────────────────
async function specToSvg(spec) {
  const vegaSpec = compile(spec).spec
  const view     = new vega.View(vega.parse(vegaSpec), { renderer: 'none' })
  return view.toSVG()
}

// ── Wrap chart SVG + card header into a standalone SVG file ─────────────────
function wrapAsSvg(chartSvg, { tag, category, dialect, bgColor, headerHeight = 72 }) {
  // Extract width/height from the inner SVG
  const wMatch = chartSvg.match(/width="([^"]+)"/)
  const hMatch = chartSvg.match(/height="([^"]+)"/)
  const w = wMatch ? parseFloat(wMatch[1]) : 500
  const h = hMatch ? parseFloat(hMatch[1]) : 400
  const totalH = h + headerHeight

  // Shift the inner SVG down by headerHeight
  const innerShifted = chartSvg
    .replace(/^<svg /, `<svg y="${headerHeight}" `)

  const tagY      = 18
  const catY      = 36
  const dialectY  = 58

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${totalH}">
  <rect width="${w}" height="${totalH}" fill="${bgColor}" />
  <text x="${w - 14}" y="${tagY}" text-anchor="end" font-family="${C.fontSans}" font-size="${C.cardTagSize}" font-weight="${C.cardTagWeight}" fill="${C.cardTagColor}">${tag}</text>
  <text x="14" y="${catY}" font-family="${C.fontSans}" font-size="${C.cardCategorySize}" font-weight="${C.cardCategoryWeight}" fill="${C.cardCategoryColor}">${category}</text>
  ${dialect ? `<text x="14" y="${dialectY}" font-family="${C.fontSans}" font-size="${C.cardDialectSize}" font-weight="${C.cardDialectWeight}" fill="${C.cardDialectColor}">${dialect}</text>` : ''}
  ${innerShifted}
</svg>`
}

// ── Slugify helper for filenames ─────────────────────────────────────────────
function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function cardHeader(tag, category, dialect) {
  return `<div class="card-header">` +
    `<div class="card-header-left">` +
      `<span class="card-category">${category}</span>` +
      (dialect ? `<span class="card-dialect">${dialect}</span>` : '') +
    `</div>` +
    `<span class="card-tag">${tag}</span>` +
  `</div>`
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let canvasHtml = ''
  let svgFilesWritten = 0

  const outDir = join(__dirname, 'output')
  mkdirSync(outDir, { recursive: true })

  for (const { label: metricLabel } of METRICS) {
    const allCategories = [...new Map(
      dialects.flatMap(d => asrData[d][metricLabel].rows.map(r => [r.category, true]))
    ).keys()]

    canvasHtml += `\n  <div class="section">\n    <h2 class="section-title">${metricLabel}</h2>`

    for (const category of allCategories) {
      canvasHtml += `\n    <div class="category-row">\n      <div class="chart-grid">`

      for (const dialect of dialects) {
        const parsed  = asrData[dialect][metricLabel]
        const rowData = parsed.rows.find(r => r.category === category)
        if (!rowData) {
          canvasHtml += `\n        <div class="chart-wrap chart-empty"></div>`
          continue
        }
        const svg = await specToSvg(buildASRSpec(parsed.modelDefs, rowData))

        // Write individual SVG file
        const fileSvg = wrapAsSvg(svg, { tag: 'Arabic ASR', category: `${metricLabel}: ${category}`, dialect, bgColor: C.cardBg })
        writeFileSync(join(outDir, `asr_${slug(metricLabel)}_${slug(category)}_${slug(dialect)}.svg`), fileSvg, 'utf-8')
        svgFilesWritten++

        canvasHtml +=
          `\n        <div class="chart-wrap">` +
          cardHeader('Arabic ASR', `${metricLabel}: ${category}`, dialect) +
          svg +
          `</div>`
      }

      canvasHtml += `\n      </div>\n    </div>`
    }

    canvasHtml += `\n  </div>`
  }

  // LLM chart
  const llmSvg = await specToSvg(buildLLMSpec())

  // Write LLM SVG file
  const llmFileSvg = wrapAsSvg(llmSvg, { tag: 'Arabic', category: 'LLM Evaluation', dialect: '', bgColor: C.cardBg })
  writeFileSync(join(outDir, 'llm.svg'), llmFileSvg, 'utf-8')
  svgFilesWritten++

  canvasHtml +=
    `\n  <div class="section">\n    <h2 class="section-title">Arabic LLM Evaluation</h2>` +
    `\n    <div class="chart-grid llm-grid">\n      <div class="chart-wrap">` +
    cardHeader('Arabic', 'LLM Evaluation', '') +
    llmSvg +
    `\n      </div>\n    </div>\n  </div>`

  const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ASR / LLM Chart Reference</title>
  ${C.fontUrlSans ? `<link rel="stylesheet" href="${C.fontUrlSans}" />` : ''}
  ${C.fontUrlMono ? `<link rel="stylesheet" href="${C.fontUrlMono}" />` : ''}
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${C.pageBg};color:${C.pageText};font-family:${C.fontSans};font-size:13px;padding:32px 40px 64px}
    h1{font-size:20px;font-weight:700;margin-bottom:4px}
    .page-sub{color:#6b6b80;font-size:11px;margin-bottom:40px}
    .section{margin-bottom:${C.sectionGap}px}
    .section-title{font-size:15px;font-weight:600;color:${C.sectionTitleColor};border-bottom:1px solid ${C.sectionBorderColor};padding-bottom:8px;margin-bottom:16px}
    .chart-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:${C.cardGap}px}
    .chart-wrap{background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:${C.cardRadius}px;padding:14px 14px 8px}
    .chart-wrap svg{width:100%;height:auto;display:block}
    .card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
    .card-header-left{display:flex;flex-direction:column;gap:2px}
    .card-tag{font-size:${C.cardTagSize}px;font-weight:${C.cardTagWeight};color:${C.cardTagColor};line-height:1.3;font-family:${C.fontSans}}
    .card-category{font-size:${C.cardCategorySize}px;font-weight:${C.cardCategoryWeight};color:${C.cardCategoryColor};line-height:1.3;font-family:${C.fontSans}}
    .card-dialect{font-size:${C.cardDialectSize}px;font-weight:${C.cardDialectWeight};color:${C.cardDialectColor};line-height:1.3;font-family:${C.fontSans}}
    .category-row{margin-bottom:24px}
    .chart-wrap.chart-empty{background:transparent;border-color:transparent}
    .llm-grid{grid-template-columns:minmax(0,1fr);max-width:900px}
  </style>
</head>
<body>
  <h1>Chart Reference \u2014 Arabic ASR &amp; LLM Evaluation</h1>
  <p class="page-sub">Generated ${genDate} \u00b7 Visual reference only \u00b7 Lower WER\u00a0=\u00a0better</p>
  ${canvasHtml}
</body>
</html>`

  writeFileSync(join(__dirname, 'charts.html'), html, 'utf-8')
  console.log(`Written: charts.html + ${svgFilesWritten} SVG files → output/`)
}

main().catch(err => { console.error(err); process.exit(1) })
