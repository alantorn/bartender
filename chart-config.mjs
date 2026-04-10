/**
 * chart-config.mjs
 * All visual tuning knobs for the chart reference output.
 * Edit here, then run: node generate-charts-vl.mjs
 */

export const CHART_CONFIG = {

  // ── Card layout ─────────────────────────────────────────────────────────────
  chartWidth:        550,   // px — Vega-Lite plot area width (axes/padding add to total SVG size)
  chartHeight:       400,   // px — Vega-Lite plot area height
  llmChartWidth:     560,   // px — LLM chart plot area width
  llmChartHeight:    220,   // px — LLM chart plot area height
  cardGap:            32,   // px — gap between chart cards in a row
  sectionGap:         64,   // px — margin between metric sections
  // Force a fixed output SVG size for Figma-consistent card dimensions.
  // Vega computes total SVG size dynamically (axis label widths vary per chart),
  // so without these the exported SVGs will have slightly different dimensions.
  // Set both to null to use Vega’s raw output (auto).
  svgWidth:         550,   // px — forced total SVG width  for ASR cards (null = auto)
  svgHeight:        460,   // px — forced total SVG height for ASR cards (null = auto)
  svgLlmWidth:      null,   // px — forced total SVG width  for LLM card  (null = auto)
  svgLlmHeight:     null,   // px — forced total SVG height for LLM card  (null = auto)
  // ── Bar appearance ───────────────────────────────────────────────────────────
  barBorderRadius:     0,   // px — rounding on bar corners
  barBorderWidth:      0,   // px — stroke width around bars
  barAlpha:         1,   // fill opacity (0–1)
  barWidth:           12,   // px — exact width of each individual bar
  barPaddingInner:   0.3,   // 0–1 — fraction of band used as gap between bars (Vega-Lite scale)

  // ── Spacing inside chart ─────────────────────────────────────────────────────
  paddingTop:         32,   // px — space above bars (for value labels)
  paddingBottom:      32,   // px — reserved for vertical model labels below x-axis

  // ── Typography ───────────────────────────────────────────────────────────────
  // Two fonts: one for numbers (mono), one for words (sans)
  // Both loaded from Google Fonts automatically when fontUrlMono / fontUrlSans are set.
  fontUrlSans:  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  fontUrlMono:  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200&display=swap',
  fontSans:     'Inter, system-ui, sans-serif',       // titles, labels, category names
  fontMono:     'JetBrains Mono',                     // numeric values, y-axis ticks — no CSS quotes, SVG attr doesn't need them

  // ── Value labels (above bars) ────────────────────────────────────────────────
  dataLabelSize:       18,   // font size px
  dataLabelWeight: '600',    // font weight  (uses fontMono)
  dataLabelColor:  '#52616F',
  dataLabelDecimals:   1,   // decimal places

  // ── Vertical model name labels (below x-axis) ────────────────────────────────
  barLabelSize:        16,   // font size px
  barLabelWeight:  '400',   // font weight  (uses fontSans)
  barLabelOffsetY:     -8,   // px — vertical offset of label anchor point (negative = up into chart)
  barLabelPaddingTop:  16,   // px — gap between x-axis domain line and the first character
  barLabelFallback: '#707088',

  // ── Chart title (removed — titles now live in card header HTML) ───────────────

  // ── Card header typography ───────────────────────────────────────────────────
  cardTagSize:          12,   // px — top-right corner tag ("Arabic ASR")
  cardTagWeight:    '300',
  cardTagColor:   '#aeaec6',
  cardCategorySize:    16,   // px — top-left: metric + category ("Speaker Age: Adult")
  cardCategoryWeight: '300',
  cardCategoryColor: '#83839a',
  cardDialectSize:     22,   // px — below category: dialect name ("Chami")
  cardDialectWeight: '600',
  cardDialectColor:  '#83839a',

  // ── Axes ─────────────────────────────────────────────────────────────────────
  showYTitle:      true,   // show/hide the Y axis title (e.g. "WER (%)", "Score")
  showYTickLabels: true,   // show/hide the numeric Y axis tick labels
  axisTickColor: '#a0a0b8',
  axisTickSize:           16,
  axisTickWeight:   '400',   // font weight of Y axis tick labels  (uses fontMono)
  yTitleColor:   '#505065',
  yTitleSize:             16,
  yTitleWeight:     '400',   // font weight of Y axis title label  (uses fontSans)
  yTitleAlign:    'left',    // text justification: 'left' | 'center' | 'right'
  yTitleY:             70,    // px — 0 = top of axis domain line, positive = move down
  gridColorX:    'rgba(255,255,255,0.04)',
  gridColorY:    'rgba(255,255,255,0.07)',

  // ── Page chrome ──────────────────────────────────────────────────────────────
  pageBg:        '#ffffff',
  pageText:      '#52616F',
  cardBg:        '#FBFBFB',
  cardBorder:    '#FBFBFB',
  cardRadius:            0,   // px
  sectionTitleColor: '#c8c8e0',
  sectionBorderColor: '#2a2a38',

}
