/**
 * defaults.ts
 * Default ChartConfig values mirroring chart-config.mjs.
 * This is the baseline used when no user override is active.
 */
import type { ChartConfig } from './types'

export const DEFAULT_CONFIG: ChartConfig = {
  // Card layout
  // svgWidth × svgHeight = total card (header + chart). chartWidth/chartHeight must
  // equal (svgWidth − paddingL − paddingR) × (svgHeight − cardHeaderHeight − paddingT − paddingB)
  // so Vega renders natively at the right size and no viewBox scaling occurs.
  // 462 − 8 − 12 = 442   |   220 − 44 − 12 − 12 = 152
  chartWidth:           442,
  chartHeight:          180,
  clusteredChartWidth:  442,
  clusteredChartHeight: 152,
  cardGap:               16,
  sectionGap:            32,
  svgWidth:             462,
  svgHeight:            220,
  svgClusteredWidth:    null,
  svgClusteredHeight:   null,

  // Bar appearance
  barBorderRadius: 0,
  barBorderWidth:  0,
  barAlpha:        1,
  barWidth:        8,
  barPaddingInner: 0.3,
  clusterStep:     null,
  clusterPaddingInner: 0.1,
  barSortOrder:    'none' as const,

  // Spacing
  paddingTop:    12,
  paddingBottom:  12,
  paddingLeft:    8,
  paddingRight:  12,

  // Typography
  fontUrlSans: '',
  fontUrlMono: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200&display=swap',
  fontSans: 'TT Norms Pro Trial',
  fontMono: 'JetBrains Mono',

  // Value labels
  dataLabelSize:     9,
  dataLabelWeight:  '600',
  dataLabelColor:   '#52616F',
  dataLabelDecimals: 1,

  // Bar labels
  barLabelSize:        8,
  barLabelWeight:     '400',
  barLabelOffsetY:      10,
  barLabelPaddingTop:   0,
  barLabelFallback:   '#707088',

  // Card header  (44 px total: line1 at 16, line2 at 28)
  cardTagSize:          8,
  cardTagWeight:       '300',
  cardTagColor:        '#8A8A8A',
  cardCategorySize:     8,
  cardCategoryWeight:  '600',
  cardCategoryColor:   '#8A8A8A',
  cardSubcategorySize:      8,
  cardSubcategoryWeight:   '300',
  cardDialectColor:    '#8A8A8A',
  cardHeaderHeight:     16,
  cardHeaderPaddingX:   12,
  cardLine1Y:           16,
  cardLineGap:           4,

  // Axes
  showYTitle:      true,
  showYTickLabels: true,
  showXDomain:       false,
  showYDomain:       true,
  showClusterLabels: true,
  showN:             false,
  nLabelSize:       8,
  nLabelColor:     '#8A8A8A',
  axisTickColor:   '#8A8A8A',
  axisTickSize:     8,
  axisTickWeight:  '400',
  yAxisLabelPadding: 4,
  yScalePadding:     15,
  yTitleColor:     '#8A8A8A',
  yTitleSize:       8,
  yTitleWeight:    '400',
  yTitleAlign:     'left',
  yTitleY:          32,
  gridColorX:      'rgba(255,255,255,0.04)',
  gridColorY:      'rgba(255,255,255,0.07)',

  // Per-model color palette — keyed by exact model name (col or label).
  // Resolution order: ModelDef.color → modelColors[name] → AUTO_COLORS[index].
  // Family groupings: Arabic/regional=amber, Gemma=teal, Llama=green, Qwen=purple, GPT=blue.
  modelColors: {
    // ── Arabic / regional ──────────────────────────────────────────────────
    'AceGPT 7B':        { bg: 'rgba(255,220,150,0.82)', border: '#7A5200' },
    'ALLaM 7B':         { bg: 'rgba(255,200,130,0.82)', border: '#7A4000' },
    'ALLaM 13B':        { bg: 'rgba(255,180,110,0.82)', border: '#6B3000' },
    'Fanar C-1':        { bg: 'rgba(255,200,175,0.82)', border: '#8B3300' },
    'Jais 13B':         { bg: 'rgba(255,165,120,0.82)', border: '#7A2500' },
    'SILMA 9B':         { bg: 'rgba(255,215,190,0.82)', border: '#7A3800' },
    'Yehia 7B':         { bg: 'rgba(255,190,155,0.82)', border: '#6B2600' },
    'Pronoia G1':       { bg: 'rgba(255,195,205,0.82)', border: '#8B1E2E' },
    // ── Google / Gemma ─────────────────────────────────────────────────────
    'Gemma 2 (9B)':     { bg: 'rgba(160,230,225,0.82)', border: '#006660' },
    'Gemma 3 27B':      { bg: 'rgba(130,210,205,0.82)', border: '#00514F' },
    // ── Meta / Llama ───────────────────────────────────────────────────────
    'Llama 3.2 3B':     { bg: 'rgba(189,228,202,0.82)', border: '#1A6B35' },
    'Llama 3.3 70B':    { bg: 'rgba(155,210,175,0.82)', border: '#0D5629' },
    'Llama 4 Scout':    { bg: 'rgba(120,192,150,0.82)', border: '#0A4420' },
    'Llama 4 Maverick': { bg: 'rgba(100,175,130,0.82)', border: '#083A1A' },
    // ── Alibaba / Qwen ─────────────────────────────────────────────────────
    'Qwen 3.5 27B':     { bg: 'rgba(235,215,255,0.82)', border: '#6B00CC' },
    'Qwen 2.5 (32B)':   { bg: 'rgba(215,190,255,0.82)', border: '#5500BB' },
    'Qwen3 14B':        { bg: 'rgba(200,170,255,0.82)', border: '#4400AA' },
    'Qwen3 32B':        { bg: 'rgba(182,152,255,0.82)', border: '#340099' },
    // ── OpenAI / GPT ───────────────────────────────────────────────────────
    'GPT-4.1 Nano':     { bg: 'rgba(215,232,255,0.82)', border: '#004DC4' },
    'GPT-4.1 Mini':     { bg: 'rgba(190,216,255,0.82)', border: '#003DB0' },
    'GPT-4.1':          { bg: 'rgba(165,200,255,0.82)', border: '#002E9C' },
    'GPT-4o Mini':      { bg: 'rgba(179,211,255,0.82)', border: '#0044CC' },
    'GPT-5 Nano':       { bg: 'rgba(200,220,255,0.82)', border: '#003888' },
    'GPT-5 Mini':       { bg: 'rgba(170,205,255,0.82)', border: '#002877' },
    'GPT-5':            { bg: 'rgba(140,185,255,0.82)', border: '#001A66' },
    // ── Others ─────────────────────────────────────────────────────────────
    'Kimi K2.5':        { bg: 'rgba(185,185,255,0.82)', border: '#1A00AA' },
    'Command R+':       { bg: 'rgba(255,185,220,0.82)', border: '#880044' },
    'Deepseek V3':      { bg: 'rgba(255,150,150,0.82)', border: '#AA0000' },
    'LFM 40B':          { bg: 'rgba(200,200,212,0.82)', border: '#3A3A55' },
  },

  // Page chrome
  pageBg:             '#ffffff',
  pageText:           '#52616F',
  cardBg:             '#ffffff',
  cardBorder:         '#FBFBFB',
  cardRadius:          0,
  sectionTitleColor:  '#c8c8e0',
  sectionBorderColor: '#2a2a38',
  showLayoutDiagram:   false,
}
