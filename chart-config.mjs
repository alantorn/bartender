/**
 * chart-config.mjs
 * All visual tuning knobs for the chart reference output.
 * Edit here, then run: node generate-charts.mjs
 */

export const CHART_CONFIG = {

  // ── Card layout ─────────────────────────────────────────────────────────────
  cardHeight:        595,   // px — height of each ASR chart card
  llmCardHeight:     380,   // px — height of the LLM chart card
  cardGap:            32,   // px — gap between chart cards in a row
  sectionGap:         64,   // px — margin between metric sections

  // ── Bar appearance ───────────────────────────────────────────────────────────
  barBorderRadius:     0,   // px — rounding on bar corners
  barBorderWidth:      0,   // px — stroke width around bars
  barAlpha:         0.82,   // fill opacity (0–1)
  barWidth:           12,   // px — exact width of each individual bar
  barInnerGap:         46,   // nudge multiplier — adjust bar x-positions within the group (try 1–20)
  barGroupGap:        20,   // px — x-axis ticks.padding (space at chart edges and between groups)

  // ── Spacing inside chart ─────────────────────────────────────────────────────
  paddingTop:         18,   // px — space above bars (for value labels)
  paddingBottom:      96,   // px — reserved for vertical model labels below x-axis

  // ── Typography ───────────────────────────────────────────────────────────────
  // Two fonts: one for numbers (mono), one for words (sans)
  // Both loaded from Google Fonts automatically when fontUrlMono / fontUrlSans are set.
  fontUrlSans:  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  fontUrlMono:  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200&display=swap',
  fontSans:     'Inter, system-ui, sans-serif',       // titles, labels, category names
  fontMono:     '"JetBrains Mono", monospace',        // numeric values, y-axis ticks

  // ── Value labels (above bars) ────────────────────────────────────────────────
  dataLabelSize:       16,   // font size px
  dataLabelWeight: '600',    // font weight  (uses fontMono)
  dataLabelColor:  '#52616F',
  dataLabelDecimals:   1,   // decimal places

  // ── Vertical model name labels (below x-axis) ────────────────────────────────
  barLabelSize:        16,   // font size px
  barLabelWeight:  '600',   // font weight  (uses fontSans)
  barLabelGap:         4,   // px gap between x-axis bottom and first character
  barLabelFallback: '#707088',

  // ── Category labels (below vertical labels) ──────────────────────────────────
  categoryLabelSize:   9,   // font size px
  categoryLabelWeight: '400',                         // uses fontSans
  categoryLabelColor: '#52616F',
  categoryLabelOffsetY: 80, // px from x-axis bottom

  // ── Chart title ──────────────────────────────────────────────────────────────
  titleSize:          12,   // font size px
  titleWeight:     '700',                             // uses fontSans
  titleColor:    '#52616F',

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
  axisTickColor: '#a0a0b8',
  axisTickSize:           9,
  axisTickWeight:   '400',                            // y-axis numbers use fontMono
  yTitleColor:   '#505065',
  yTitleSize:             9,
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
