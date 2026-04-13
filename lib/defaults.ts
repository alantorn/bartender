/**
 * defaults.ts
 * Default ChartConfig values mirroring chart-config.mjs.
 * This is the baseline used when no user override is active.
 */
import type { ChartConfig } from './types'

export const DEFAULT_CONFIG: ChartConfig = {
  // Card layout
  chartWidth:           550,
  chartHeight:          400,
  clusteredChartWidth:  560,
  clusteredChartHeight: 220,
  cardGap:               32,
  sectionGap:            64,
  svgWidth:             null,
  svgHeight:            null,
  svgClusteredWidth:    null,
  svgClusteredHeight:   null,

  // Bar appearance
  barBorderRadius: 0,
  barBorderWidth:  0,
  barAlpha:        1,
  barWidth:        12,
  barPaddingInner: 0.3,
  clusterStep:     null,
  clusterPaddingInner: 0.1,
  barSortOrder:    'none' as const,

  // Spacing
  paddingTop:    32,
  paddingBottom: 32,
  paddingLeft:    8,
  paddingRight:  16,

  // Typography
  fontUrlSans: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap',
  fontUrlMono: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200&display=swap',
  fontSans: 'TT Hoves Pro Trial',
  fontMono: 'JetBrains Mono',

  // Value labels
  dataLabelSize:     18,
  dataLabelWeight:  '600',
  dataLabelColor:   '#52616F',
  dataLabelDecimals: 1,

  // Bar labels
  barLabelSize:        16,
  barLabelWeight:     '400',
  barLabelOffsetY:     -8,
  barLabelPaddingTop:  16,
  barLabelFallback:   '#707088',

  // Card header
  cardTagSize:          12,
  cardTagWeight:       '300',
  cardTagColor:        '#aeaec6',
  cardCategorySize:     16,
  cardCategoryWeight:  '300',
  cardCategoryColor:   '#83839a',
  cardDialectSize:      22,
  cardDialectWeight:   '600',
  cardDialectColor:    '#83839a',
  cardHeaderHeight:     80,
  cardHeaderPaddingX:   14,
  cardLine1Y:           36,
  cardLineGap:           6,

  // Axes
  showYTitle:      true,
  showYTickLabels: true,
  showXDomain:       false,
  showClusterLabels: true,
  showN:             false,
  nLabelSize:      11,
  nLabelColor:     '#aeaec6',
  axisTickColor:   '#a0a0b8',
  axisTickSize:     16,
  axisTickWeight:  '400',
  yAxisLabelPadding: 8,
  yTitleColor:     '#505065',
  yTitleSize:       16,
  yTitleWeight:    '400',
  yTitleAlign:     'left',
  yTitleY:          70,
  gridColorX:      'rgba(255,255,255,0.04)',
  gridColorY:      'rgba(255,255,255,0.07)',

  // Page chrome
  pageBg:             '#ffffff',
  pageText:           '#52616F',
  cardBg:             '#FBFBFB',
  cardBorder:         '#FBFBFB',
  cardRadius:          0,
  sectionTitleColor:  '#c8c8e0',
  sectionBorderColor: '#2a2a38',
  showLayoutDiagram:   true,
}
