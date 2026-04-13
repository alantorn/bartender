'use client'

import { useState } from 'react'
import FileDropZone from '@/components/FileDropZone'
import ConfigEditor from '@/components/ConfigEditor'
import type { ChartConfig, SeriesColor } from '@/lib/types'

type ChartType = 'bar' | 'box' | 'scatter'
type SplitBy   = 'none' | 'row' | 'column'
type Tab       = 'sheets' | 'style'

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
  cardIds:                string[]
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function parseMetrics(json: string): { label: string; chartType: ChartType; pivot: boolean; splitBy: SplitBy; showClusterLabels: boolean }[] {
  try {
    const datasets = JSON.parse(json)
    if (!Array.isArray(datasets) || !datasets[0]?.metrics) return []
    return (datasets[0].metrics as { label: string; chartType?: ChartType; pivot?: boolean; splitBy?: SplitBy; showClusterLabels?: boolean }[]).map(m => ({
      label:             m.label,
      chartType:         m.chartType ?? 'bar',
      pivot:             m.pivot ?? false,
      splitBy:           m.splitBy ?? 'none',
      showClusterLabels: m.showClusterLabels ?? true,
    }))
  } catch { return [] }
}

/** Deduplicated series color entries — one per unique col name. */
interface SeriesColorEntry {
  col:   string
  label?: string
  color: SeriesColor
}

function parseMetricColors(json: string): SeriesColorEntry[] {
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
  } catch { return json }
}

/** Patch a color field for ALL metrics that contain the given col. */
function patchSeriesColor(json: string, col: string, colorKey: 'bg' | 'border', value: string): string {
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

// ─── slug (mirrors generator.ts) ────────────────────────────────────────────
function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── component ───────────────────────────────────────────────────────────────

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
  cardIds,
}: DataSidebarProps) {
  const [tab, setTab] = useState<Tab>('sheets')
  const metrics      = parseMetrics(datasetsJson)
  const metricColors = parseMetricColors(datasetsJson)

  const tabCls = (t: Tab) =>
    `flex-1 py-1.5 text-xs font-medium transition-colors ${
      tab === t
        ? 'text-white border-b-2 border-indigo-400'
        : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
    }`

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center px-4 border-b border-white/5">
        <span className="text-white font-semibold text-sm tracking-wide">Bartender</span>
      </div>

      {/* Tab strip */}
      <div className="flex shrink-0 px-2 border-b border-white/5">
        <button className={tabCls('sheets')} onClick={() => setTab('sheets')}>Sheets</button>
        <button className={tabCls('style')}  onClick={() => setTab('style')}>Style</button>
      </div>

      {/* ── Sheets tab ── */}
      {tab === 'sheets' && (
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4 gap-4">
          {/* File drop */}
          <FileDropZone
            datasetId="file"
            datasetLabel="Document"
            onFile={(_, f) => onFile(f)}
            current={file}
          />

          {/* Re-detect */}
          <div>
            <button
              onClick={onReInspect}
              disabled={inspecting}
              className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline disabled:opacity-40"
            >
              Re-detect sheets
            </button>
          </div>

          {/* Status */}
          {inspecting     && <p className="text-xs text-gray-400 animate-pulse">Detecting structure…</p>}
          {inspectError   && <p className="text-xs text-red-400 whitespace-pre-wrap">{inspectError}</p>}
          {inspectSummary && <p className="text-xs text-green-400">{inspectSummary}</p>}

          {/* Metrics list */}
          {metrics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1">Sheets</p>
              <div className="flex flex-col gap-1">
                {metrics.map(m => (
                  <div key={m.label} className="flex flex-col gap-0.5 py-1 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-1">
                      {(() => {
                        const metricSlug = slug(m.label)
                        const firstCardId = cardIds.find(id => id.includes(metricSlug))
                        return firstCardId ? (
                          <button
                            title="Scroll to preview"
                            onClick={() => document.getElementById(`card-${firstCardId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className="flex-1 text-left text-xs text-gray-300 truncate hover:text-indigo-400 transition-colors"
                          >{m.label}</button>
                        ) : (
                          <span className="flex-1 text-xs text-gray-300 truncate" title={m.label}>{m.label}</span>
                        )
                      })()}
                    </div>
                    {m.chartType !== 'box' && (
                    <div className="flex items-center gap-1">
                      <select
                        value={m.chartType}
                        onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, m.label, 'chartType', e.target.value as ChartType))}
                        className="bg-white/10 border border-white/20 text-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {CHART_TYPES.map(ct => (
                          <option key={ct.value} value={ct.value} className="bg-gray-800">{ct.label}</option>
                        ))}
                      </select>
                      {(m.chartType === 'bar' || m.chartType === 'scatter') && (
                        <button
                          title={m.pivot ? 'Flip on (click to reset)' : 'Flip off (click to flip axes)'}
                          onClick={() => onDatasetsJsonChange(patchMetricField(datasetsJson, m.label, 'pivot', !m.pivot))}
                          className={`px-1.5 py-0.5 rounded border text-xs transition-colors ${
                            m.pivot
                              ? 'border-indigo-500 text-indigo-300 bg-indigo-500/20'
                              : 'border-white/20 text-gray-400 hover:text-gray-200'
                          }`}
                        >⇄</button>
                      )}
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
                      {m.chartType === 'bar' && (
                        <label className="flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={m.showClusterLabels}
                            onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, m.label, 'showClusterLabels', e.target.checked))}
                            className="accent-indigo-400 cursor-pointer"
                          />
                          <span className="text-xs text-gray-400">title</span>
                        </label>
                      )}
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Style tab ── */}
      {tab === 'style' && (
        <div className="flex flex-col flex-1 overflow-y-auto px-4 py-4 gap-6">

          {/* Series colors */}
          {metricColors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-2">Series colors</p>
              <div className="flex flex-col gap-2">
                {metricColors.map(d => (
                  <div key={d.col} className="flex flex-col gap-0.5">
                    <span className="text-xs text-gray-400 truncate" title={d.label ?? d.col}>{d.label ?? d.col}</span>
                    <div className="flex items-center gap-1.5">
                      {/* Fill swatch + hex */}
                      <input
                        type="color"
                        title="Bar fill"
                        value={toHex(d.color.bg)}
                        onChange={e => onDatasetsJsonChange(patchSeriesColor(datasetsJson, d.col, 'bg', e.target.value))}
                        className="h-6 w-7 rounded border border-white/20 p-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={toHex(d.color.bg)}
                        onChange={e => onDatasetsJsonChange(patchSeriesColor(datasetsJson, d.col, 'bg', e.target.value))}
                        className="w-20 bg-white/10 border border-white/20 text-gray-200 rounded px-1.5 py-0.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        spellCheck={false}
                      />
                      <span className="text-gray-600 text-xs">/</span>
                      {/* Border/label swatch + hex */}
                      <input
                        type="color"
                        title="Label / border color"
                        value={toHex(d.color.border)}
                        onChange={e => onDatasetsJsonChange(patchSeriesColor(datasetsJson, d.col, 'border', e.target.value))}
                        className="h-6 w-7 rounded border border-white/20 p-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={toHex(d.color.border)}
                        onChange={e => onDatasetsJsonChange(patchSeriesColor(datasetsJson, d.col, 'border', e.target.value))}
                        className="w-20 bg-white/10 border border-white/20 text-gray-200 rounded px-1.5 py-0.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Config knobs */}
          {config && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Chart configuration</span>
                <button
                  onClick={onSave}
                  className="text-xs px-2 py-0.5 rounded border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
                >
                  Save
                </button>
              </div>
              <ConfigEditor config={config} onChange={onChange} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Convert any CSS color string to a #rrggbb hex for <input type="color">. 
 *  Falls back to #808080 for rgba/named colors the browser can't parse inline. */
function toHex(css: string): string {
  // Already a 6-digit hex
  if (/^#[0-9a-f]{6}$/i.test(css)) return css
  // 3-digit hex
  if (/^#[0-9a-f]{3}$/i.test(css)) {
    const [, a, b, c] = css
    return `#${a}${a}${b}${b}${c}${c}`
  }
  // rgba(r,g,b,a) or rgb(r,g,b)
  const m = css.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/)
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
  }
  return '#808080'
}

