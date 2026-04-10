// ── Shared types used across the studio ──────────────────────────────────────

export interface SeriesColor {
  bg: string     // CSS color for bar fill
  border: string // CSS color for label text / bar stroke
}

export interface ModelDef {
  col:    string       // column header in CSV/sheet
  label?: string       // display name — defaults to col if omitted
  color?: SeriesColor
}

export interface Metric {
  label:   string  // display label
  fileKey: string  // token used in filePattern / sheetPattern
}

export interface ASRDataset {
  type:          'asr'
  id:            string
  tag:           string
  sectionTitle:  string
  yTitle:        string
  source:        'csv' | 'xlsx'
  filePattern?:  string
  sheetPattern?: string
  xlsxFile?:     string
  groups:        Record<string, ModelDef[]>
  metrics:       Metric[]
}

export interface ClusteredDataset {
  type:          'clustered'
  id:            string
  tag:           string
  sectionTitle:  string
  yTitle:        string
  source:        'csv' | 'xlsx'
  file?:         string
  sheet?:        string
  xlsxFile?:     string
  seriesColors?: Record<string, SeriesColor>
}

export type Dataset = ASRDataset | ClusteredDataset

export interface PageMeta {
  title:    string
  subtitle: string
}

export interface ChartConfig {
  // Card layout
  chartWidth:        number
  chartHeight:       number
  clusteredChartWidth:  number
  clusteredChartHeight: number
  cardGap:           number
  sectionGap:        number
  svgWidth:          number | null
  svgHeight:         number | null
  svgClusteredWidth:  number | null
  svgClusteredHeight: number | null
  // Bar appearance
  barBorderRadius:   number
  barBorderWidth:    number
  barAlpha:          number
  barWidth:          number
  barPaddingInner:   number
  // Spacing
  paddingTop:        number
  paddingBottom:     number
  // Typography
  fontUrlSans:       string
  fontUrlMono:       string
  fontSans:          string
  fontMono:          string
  // Value labels
  dataLabelSize:     number
  dataLabelWeight:   string
  dataLabelColor:    string
  dataLabelDecimals: number
  // Bar labels
  barLabelSize:      number
  barLabelWeight:    string
  barLabelOffsetY:   number
  barLabelPaddingTop: number
  barLabelFallback:  string
  // Card header
  cardTagSize:       number
  cardTagWeight:     string
  cardTagColor:      string
  cardCategorySize:  number
  cardCategoryWeight: string
  cardCategoryColor: string
  cardDialectSize:   number
  cardDialectWeight: string
  cardDialectColor:  string
  // Axes
  showYTitle:        boolean
  showYTickLabels:   boolean
  axisTickColor:     string
  axisTickSize:      number
  axisTickWeight:    string
  yTitleColor:       string
  yTitleSize:        number
  yTitleWeight:      string
  yTitleAlign:       string
  yTitleY:           number
  gridColorX:        string
  gridColorY:        string
  // Page chrome
  pageBg:            string
  pageText:          string
  cardBg:            string
  cardBorder:        string
  cardRadius:        number
  sectionTitleColor: string
  sectionBorderColor: string
}

// What the generate API returns per card
export interface GeneratedCard {
  id:       string   // filename without .svg
  svgData:  string   // full SVG markup
}

export interface GenerateResult {
  cards: GeneratedCard[]
}
