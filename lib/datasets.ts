/**
 * Shared helpers for reading and patching the datasets JSON string.
 * Imported by DataSidebar, Preview, and any future sidebar replacement.
 */

import type { SeriesColor } from '@/lib/types'

export type ChartType = 'bar' | 'box' | 'scatter'
export type SplitBy   = 'none' | 'row' | 'column'

export interface MetricEntry {
  label:             string
  chartType:         ChartType
  pivot:             boolean
  splitBy:           SplitBy
  showClusterLabels: boolean
}

export interface SeriesColorEntry {
  col:    string
  label?: string
  color:  SeriesColor
}

/** Convert a display label to a URL/filename-safe slug (mirrors generator.ts). */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Parse metric display settings from the first dataset in the JSON string. */
export function parseMetrics(json: string): MetricEntry[] {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets) || !datasets[0]?.metrics) return []
    return (datasets[0].metrics as {
      label: string
      chartType?: ChartType
      pivot?: boolean
      splitBy?: SplitBy
      showClusterLabels?: boolean
    }[]).map(m => ({
      label:             m.label,
      chartType:         m.chartType ?? 'bar',
      pivot:             m.pivot ?? false,
      splitBy:           m.splitBy ?? 'none',
      showClusterLabels: m.showClusterLabels ?? true,
    }))
  } catch { return [] }
}

/** Collect deduplicated series color entries from all metrics' modelDefs. */
export function parseMetricColors(json: string): SeriesColorEntry[] {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets) || !datasets[0]?.metrics) return []
    const seen = new Map<string, SeriesColorEntry>()
    for (const m of datasets[0].metrics as { modelDefs?: { col: string; label?: string; color?: SeriesColor }[] }[]) {
      if (!m.modelDefs?.length) continue
      for (const d of m.modelDefs) {
        if (!seen.has(d.col)) {
          seen.set(d.col, {
            col:   d.col,
            label: d.label,
            color: d.color ?? { bg: '#cccccc', border: '#666666' },
          })
        }
      }
    }
    return [...seen.values()]
  } catch { return [] }
}

/** Patch a single field on every metric whose label matches. */
export function patchMetricField<T>(json: string, metricLabel: string, key: string, value: T): string {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets)) return json
    for (const ds of datasets) {
      if (!ds.metrics) continue
      for (const m of ds.metrics) {
        if (m.label === metricLabel) m[key] = value
      }
    }
    return JSON.stringify(datasets, null, 2)
  } catch { return json }
}

/** Patch a fill or border color for all modelDefs whose col matches. */
export function patchSeriesColor(json: string, col: string, colorKey: 'bg' | 'border', value: string): string {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets)) return json
    for (const ds of datasets) {
      if (!ds.metrics) continue
      for (const m of ds.metrics) {
        if (!m.modelDefs) continue
        for (const d of m.modelDefs) {
          if (d.col === col) {
            d.color = { ...(d.color ?? { bg: '#cccccc', border: '#666666' }), [colorKey]: value }
          }
        }
      }
    }
    return JSON.stringify(datasets, null, 2)
  } catch { return json }
}
