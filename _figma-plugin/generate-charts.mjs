import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { modelChartColor, LLM_COLORS } from './colors.mjs'
import { CHART_CONFIG as C } from './chart-config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, 'data')

const DIALECT_MODELS = {
  Chami: [
    { col: 'google1', label: 'Google' },
    { col: 'aws',     label: 'AWS'    },
    { col: 'azure1',  label: 'Azure'  },
    { col: 'whisper', label: 'Whisper'},
  ],
  Egyptian: [
    { col: 'google',  label: 'Google' },
    { col: 'aws',     label: 'AWS'    },
    { col: 'azure',   label: 'Azure'  },
    { col: 'whisper', label: 'Whisper'},
  ],
  Hijazi: [
    { col: 'aws',     label: 'AWS'    },
    { col: 'azure',   label: 'Azure'  },
    { col: 'whisper', label: 'Whisper'},
  ],
  Najdi: [
    { col: 'google',  label: 'Google' },
    { col: 'aws',     label: 'AWS'    },
    { col: 'azure',   label: 'Azure'  },
    { col: 'whisper', label: 'Whisper'},
  ],
}

// Colors imported from colors.mjs

function parseASRCsv(content, dialect) {
  const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const headers = lines[0].split(',')
  const modelDefs = DIALECT_MODELS[dialect]
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',')
    const entry = { category: cols[0], values: {}, count: parseInt(cols[cols.length - 1]) || 0 }
    headers.slice(1).forEach((h, i) => { entry.values[h] = parseFloat(cols[i + 1]) })
    return entry
  })
  return { modelDefs, rows }
}

function parseAxisCsv(content) {
  const lines = content.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows = []
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

const dialects = ['Chami', 'Egyptian', 'Hijazi', 'Najdi']

const METRICS = [
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

const axisRaw   = readFileSync(join(dataDir, 'axis', 'Arabic LLM Evaluation - Sheet11.csv'), 'utf-8')
const axisRows  = parseAxisCsv(axisRaw)
const llmModels = axisRows[0]?.models ?? []

function buildASRDatasets(parsed) {
  return parsed.modelDefs.map(({ col, label }) => {
    const c = modelChartColor(label)
    const data = parsed.rows.map(r => +(r.values[col] ?? 0).toFixed(C.dataLabelDecimals))
    return {
      label,
      data,
      backgroundColor:     c.bg,
      borderColor:         c.border,
      borderWidth:         C.barBorderWidth,
      borderRadius:        C.barBorderRadius,
      barThickness:        C.barWidth,
    }
  })
}

function buildLLMDatasets() {
  return llmModels.map((model, mi) => {
    const data = axisRows.map(r => +r.values[mi].toFixed(2))
    return {
      label:           model,
      data,
      backgroundColor: LLM_COLORS[mi] ? `rgba(${LLM_COLORS[mi].rgb},${C.barAlpha})` : 'rgba(200,200,200,0.7)',
      borderColor:         LLM_COLORS[mi]?.hex ?? '#aaa',
      borderWidth:         C.barBorderWidth,
      borderRadius:        C.barBorderRadius,
      barThickness:        C.barWidth,
    }
  })
}

function makeConfig(labels, datasets, title, yAxisLabel) {
  return {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           false,
      events:              [],
      layout: { padding: { top: C.paddingTop, bottom: C.paddingBottom } },
      plugins: {
        title: { display: false },
        legend: { display: false },
        datalabels: {
          anchor:    'end',
          align:     'end',
          offset:    1,
          color:     C.dataLabelColor,
          font:      { size: C.dataLabelSize, weight: C.dataLabelWeight, family: C.fontMono },
          clamp:     true,
        },
      },
      scales: {
        x: {
          ticks: { display: false, padding: C.barGroupGap },
          grid:  { color: C.gridColorX },
          offset: true,
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: yAxisLabel, color: C.yTitleColor, font: { size: C.yTitleSize } },
          ticks: { color: C.axisTickColor, font: { size: C.axisTickSize, weight: C.axisTickWeight, family: C.fontMono } },
          grid:  { color: C.gridColorY },
        },
      },
    },
  }
}

let canvasHtml = ''
let scriptJs   = ''
let idx        = 0

for (const { label: metricLabel } of METRICS) {
  const allCategories = [...new Map(
    dialects.flatMap(d => asrData[d][metricLabel].rows.map(r => [r.category, true]))
  ).keys()]

  canvasHtml += `\n  <div class="section">\n    <h2 class="section-title">${metricLabel}</h2>`

  for (const category of allCategories) {
    canvasHtml += `\n    <div class="category-row">\n      <h3 class="category-label">${category}</h3>\n      <div class="chart-grid">`

    for (const dialect of dialects) {
      const parsed  = asrData[dialect][metricLabel]
      const rowData = parsed.rows.find(r => r.category === category)
      if (!rowData) {
        canvasHtml += `\n        <div class="chart-wrap chart-empty"></div>`
        continue
      }
      const id           = `c${idx++}`
      const singleParsed = { modelDefs: parsed.modelDefs, rows: [rowData] }
      const datasets     = buildASRDatasets(singleParsed)
      const cfg          = makeConfig([category], datasets, `Arabic ASR — ${metricLabel} — ${category} — ${dialect}`, 'WER (%)')
      canvasHtml += `\n        <div class="chart-wrap"><div class="card-header"><div class="card-header-left"><span class="card-category">${metricLabel}: ${category}</span><span class="card-dialect">${dialect}</span></div><span class="card-tag">Arabic ASR</span></div><canvas id="${id}"></canvas></div>`
      scriptJs   += `{const _c=${JSON.stringify(cfg)};_c.plugins=[verticalBarLabels];new Chart(document.getElementById('${id}'),_c);}\n`
    }

    canvasHtml += `\n      </div>\n    </div>`
  }

  canvasHtml += `\n  </div>`
}

const llmId  = `c${idx++}`
const llmCfg = makeConfig(axisRows.map(r => r.category), buildLLMDatasets(), 'Arabic LLM Evaluation', 'Score')
canvasHtml += `\n  <div class="section">\n    <h2 class="section-title">Arabic LLM Evaluation</h2>\n    <div class="chart-grid llm-grid"><div class="chart-wrap llm-wrap"><div class="card-header"><div class="card-header-left"><span class="card-category">LLM Evaluation</span></div><span class="card-tag">Arabic</span></div><canvas id="${llmId}"></canvas></div></div>\n  </div>`
scriptJs   += `{const _c=${JSON.stringify(llmCfg)};_c.plugins=[verticalBarLabels];new Chart(document.getElementById('${llmId}'),_c);}\n`

const genDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ASR / LLM Chart Reference</title>
  <link rel="stylesheet" href="model-colors.css" />
  ${C.fontUrlSans ? '<link rel="stylesheet" href="' + C.fontUrlSans + '" />' : ''}
  ${C.fontUrlMono ? '<link rel="stylesheet" href="' + C.fontUrlMono + '" />' : ''}
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"><\/script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${C.pageBg};color:${C.pageText};font-family:system-ui,sans-serif;font-size:13px;padding:32px 40px 64px}
    h1{font-size:20px;font-weight:700;margin-bottom:4px;color:#fff}
    .page-sub{color:#6b6b80;font-size:11px;margin-bottom:40px}
    .section{margin-bottom:${C.sectionGap}px}
    .section-title{font-size:15px;font-weight:600;color:${C.sectionTitleColor};border-bottom:1px solid ${C.sectionBorderColor};padding-bottom:8px;margin-bottom:16px}
    .chart-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:${C.cardGap}px}
    .chart-wrap{background:${C.cardBg};border:1px solid ${C.cardBorder};border-radius:${C.cardRadius}px;padding:14px 14px 8px;height:${C.cardHeight}px;display:flex;flex-direction:column}
    .chart-wrap canvas{flex:1;min-height:0}
    .card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-shrink:0}
    .card-header-left{display:flex;flex-direction:column;gap:2px}
    .card-tag{font-size:${C.cardTagSize}px;font-weight:${C.cardTagWeight};color:${C.cardTagColor};line-height:1.3;font-family:${C.fontSans}}
    .card-category{font-size:${C.cardCategorySize}px;font-weight:${C.cardCategoryWeight};color:${C.cardCategoryColor};line-height:1.3;font-family:${C.fontSans}}
    .card-dialect{font-size:${C.cardDialectSize}px;font-weight:${C.cardDialectWeight};color:${C.cardDialectColor};line-height:1.3;font-family:${C.fontSans}}
    .category-row{margin-bottom:24px}
    .category-label{font-size:11px;font-weight:600;color:${C.categoryLabelColor};margin-bottom:10px}
    .chart-wrap.chart-empty{background:transparent;border-color:transparent}
    .llm-grid{grid-template-columns:minmax(0,520px)}
    .llm-wrap{height:${C.llmCardHeight}px}
  </style>
</head>
<body>
  <h1>Chart Reference \u2014 Arabic ASR &amp; LLM Evaluation</h1>
  <p class="page-sub">Generated ${genDate} \u00b7 Visual reference only \u00b7 Lower WER\u00a0=\u00a0better</p>
  ${canvasHtml}
  <script>
    Chart.register(ChartDataLabels);
    Chart.defaults.font.family = '${C.fontSans}';
    Chart.defaults.font.size   = ${C.axisTickSize};
    const _cfg = {
      barLabelGap:      ${C.barLabelGap},
      barLabelSize:     ${C.barLabelSize},
      barLabelWeight:   '${C.barLabelWeight}',
      barLabelFallback: '${C.barLabelFallback}',
      fontSans:         '${C.fontSans}',
      barInnerGap:      ${C.barInnerGap},
    };
    const verticalBarLabels = {
      id: 'verticalBarLabels',
      afterLayout(chart) {
        // Snapshot natural bar positions before any shifts (fires on update, not on hover re-renders)
        chart.data.datasets.forEach((_, di) => {
          const meta = chart.getDatasetMeta(di);
          meta.data.forEach(bar => { bar._baseX = bar.x; });
        });
      },
      beforeDatasetsDraw(chart) {
        const numDS = chart.data.datasets.length;
        chart.data.datasets.forEach((_, di) => {
          const meta = chart.getDatasetMeta(di);
          if (meta.hidden) return;
          const shift = (di - (numDS - 1) / 2) * _cfg.barInnerGap;
          meta.data.forEach(bar => { bar.x = (bar._baseX ?? bar.x) + shift; });
        });
      },
      afterDraw(chart) {
        const { ctx, data, scales: { x, y } } = chart;
        const baseY = y.bottom;
        data.datasets.forEach((dataset, di) => {
          const meta = chart.getDatasetMeta(di);
          if (meta.hidden) return;
          meta.data.forEach((bar) => {
            ctx.save();
            ctx.translate(bar.x, baseY + _cfg.barLabelGap);
            ctx.rotate(Math.PI / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = dataset.borderColor || _cfg.barLabelFallback;
            ctx.font = _cfg.barLabelWeight + ' ' + _cfg.barLabelSize + 'px ' + _cfg.fontSans;
            ctx.fillText(dataset.label, 0, 0);
            ctx.restore();
          });
        });
      }
    };
    ${scriptJs}
  <\/script>
</body>
</html>`

writeFileSync(join(__dirname, 'charts.html'), html, 'utf-8')
console.log('Written: charts.html')
