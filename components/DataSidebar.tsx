'use client'

import FileDropZone from '@/components/FileDropZone'
import ConfigEditor from '@/components/ConfigEditor'
import type { ChartConfig } from '@/lib/types'

type ChartType = 'bar' | 'box' | 'scatter'

type SplitBy = 'none' | 'row' | 'column'

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar',     label: 'Bar' },
  { value: 'box',     label: 'Box' },
  { value: 'scatter', label: 'Scatter' },
]

const SPLIT_BY: { value: SplitBy; label: string }[] = [
  { value: 'none',   label: '1 chart' },
  { value: 'row',    label: '÷ rows' },
  { value: 'column', label: '÷ cols' },
]

export interface DataSidebarProps {
  file:                   File | null
  onFile:                 (file: File) => void
  onReInspect:            () => void
  inspecting:             boolean
  inspectError:           string | null
  inspectSummary:         string | null
  datasetsJson:           string
  onDatasetsJsonChange:   (v: string) => void
  config:                 ChartConfig | null
  onChange:               (patch: Partial<ChartConfig>) => void
  onSave:                 () => void
}

/** Parse metrics out of the datasets JSON safely; returns [] on error. */
function parseMetrics(json: string): { label: string; chartType: ChartType; pivot: boolean; splitBy: SplitBy }[] {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets) || !datasets[0]?.metrics) return []
    return (datasets[0].metrics as { label: string; chartType?: ChartType; pivot?: boolean; splitBy?: SplitBy }[]).map(m => ({
      label:     m.label,
      chartType: m.chartType ?? 'bar',
      pivot:     m.pivot ?? false,
      splitBy:   m.splitBy ?? 'none',
    }))
  } catch {
    return []
  }
}

/** Generic patch for any scalar metric field. */
function patchMetricField<T>(json: string, metricLabel: string, key: string, value: T): string {
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
  } catch {
    return json
  }
}

/** Patch chartType for one metric in the datasets JSON string. */
function patchMetricType(json: string, metricLabel: string, chartType: ChartType): string {
  return patchMetricField(json, metricLabel, 'chartType', chartType)
}

export default function DataSidebar({
  file,
  onFile,
  onReInspect,
  inspecting,
  inspectError,
  inspectSummary,
  datasetsJson,
  onDatasetsJsonChange,
  config,
  onChange,
  onSave,
}: DataSidebarProps) {
  const metrics = parseMetrics(datasetsJson)

  return (
    <div className="flex flex-col h-full bg-gray-900 px-4 py-4 gap-4 overflow-y-auto">
      {/* App name */}
      <div className="flex h-10 shrink-0 items-center">
        <span className="text-white font-semibold text-sm tracking-wide">Bartender</span>
      </div>

      {/* File drop */}
      <FileDropZone
        datasetId="file"
        datasetLabel="Document"
        onFile={(_, f) => onFile(f)}
        current={file}
      />

      {/* Re-detect button */}
      <div>
        <button
          onClick={onReInspect}
          disabled={inspecting}
          className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline disabled:opacity-40"
        >
          Re-detect sheets
        </button>
      </div>

      {/* Status messages */}
      {inspecting    && <p className="text-xs text-gray-400 animate-pulse">Detecting structure…</p>}
      {inspectError  && <p className="text-xs text-red-400 whitespace-pre-wrap">{inspectError}</p>}
      {inspectSummary && <p className="text-xs text-green-400">{inspectSummary}</p>}

      {/* Metrics / chart-type picker */}
      {metrics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">Sheets</p>
          <div className="flex flex-col gap-1">
            {metrics.map(m => (
              <div key={m.label} className="flex flex-col gap-0.5 py-1 border-b border-white/5 last:border-0">
                <span className="text-xs text-gray-300 truncate" title={m.label}>
                  {m.label}
                </span>
                <div className="flex items-center gap-1">
                  {/* Chart type */}
                  <select
                    value={m.chartType}
                    onChange={e => onDatasetsJsonChange(patchMetricType(datasetsJson, m.label, e.target.value as ChartType))}
                    className="bg-white/10 border border-white/20 text-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {CHART_TYPES.map(ct => (
                      <option key={ct.value} value={ct.value} className="bg-gray-800">{ct.label}</option>
                    ))}
                  </select>
                  {/* Pivot toggle — bar only */}
                  {m.chartType === 'bar' && (
                    <button
                      title={m.pivot ? 'Pivot: cols on x-axis (click to reset)' : 'Pivot: rows on x-axis (click to flip)'}
                      onClick={() => onDatasetsJsonChange(patchMetricField(datasetsJson, m.label, 'pivot', !m.pivot))}
                      className={`px-1.5 py-0.5 rounded border text-xs transition-colors ${
                        m.pivot
                          ? 'border-indigo-500 text-indigo-300 bg-indigo-500/20'
                          : 'border-white/20 text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      ⇄
                    </button>
                  )}
                  {/* Split-by */}
                  {m.chartType === 'bar' && (
                    <select
                      value={m.splitBy}
                      onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, m.label, 'splitBy', e.target.value as SplitBy))}
                      className="bg-white/10 border border-white/20 text-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {SPLIT_BY.map(s => (
                        <option key={s.value} value={s.value} className="bg-gray-800">{s.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config knobs */}
      {config && (
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Chart configuration</span>
            <button
              onClick={onSave}
              className="text-xs px-2 py-0.5 rounded border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
            >
              Save
            </button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <ConfigEditor config={config} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  )
}

