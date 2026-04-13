'use client'

import type { GeneratedCard } from '@/lib/types'
import {
  type ChartType,
  type SplitBy,
  type MetricEntry,
  parseMetrics,
  patchMetricField,
  slug,
} from '@/lib/datasets'

interface Props {
  cards:                GeneratedCard[]
  loading:              boolean
  error?:               string | null
  datasetsJson:         string
  onDatasetsJsonChange: (v: string) => void
}

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

function downloadCard(card: GeneratedCard) {
  const blob = new Blob([card.svgData], { type: 'image/svg+xml' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `${card.id}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export default function Preview({ cards, loading, error, datasetsJson, onDatasetsJsonChange }: Props) {
  if (error) {
    return (
      <div className="rounded-lg bg-red-950/40 border border-red-800 text-red-400 px-4 py-3 text-sm">
        <strong>Error:</strong> {error}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-sm text-zinc-500 animate-pulse py-8 text-center">
        Generating charts…
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="text-sm text-zinc-500 py-8 text-center">
        Upload a file and click <strong>Generate</strong> to preview charts here.
      </div>
    )
  }

  const metrics = parseMetrics(datasetsJson)

  return (
    <div className="flex flex-col items-start gap-6">
      {cards.map(card => {
        const metric = metrics.find(m => card.id.includes(`_${slug(m.label)}_`) || card.id.endsWith(`_${slug(m.label)}`))
        return (
          <div key={card.id} id={`card-${card.id}`} className="border border-zinc-700 rounded-lg overflow-hidden shadow-sm shadow-zinc-950">
            <div dangerouslySetInnerHTML={{ __html: card.svgData }} />
            <div className="px-3 py-1.5 bg-zinc-800 border-t border-zinc-700 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-zinc-500 font-mono truncate shrink-0 max-w-48">{card.id}.svg</span>
              {metric && metric.chartType !== 'box' && (
                <>
                  <select
                    value={metric.chartType}
                    onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, metric.label, 'chartType', e.target.value))}
                    className="border border-zinc-600 rounded px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {CHART_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                  {(metric.chartType === 'bar' || metric.chartType === 'scatter') && (
                    <button
                      title={metric.pivot ? 'Flipped (click to reset)' : 'Normal (click to flip)'}
                      onClick={() => onDatasetsJsonChange(patchMetricField(datasetsJson, metric.label, 'pivot', !metric.pivot))}
                      className={`px-1.5 py-0.5 rounded border text-xs transition-colors ${metric.pivot ? 'border-indigo-400 text-indigo-400 bg-indigo-950/40' : 'border-zinc-600 text-zinc-400 hover:text-zinc-200'}`}
                    >⇄</button>
                  )}
                  {metric.chartType === 'bar' && (
                    <select
                      value={metric.splitBy}
                      onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, metric.label, 'splitBy', e.target.value))}
                      className="border border-zinc-600 rounded px-1.5 py-0.5 text-xs bg-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {SPLIT_BY.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  )}
                  {metric.chartType === 'bar' && (
                    <label className="flex items-center gap-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={metric.showClusterLabels}
                        onChange={e => onDatasetsJsonChange(patchMetricField(datasetsJson, metric.label, 'showClusterLabels', e.target.checked))}
                        className="accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs text-zinc-400">cluster labels</span>
                    </label>
                  )}
                </>
              )}
              <div className="flex-1" />
              <button
                onClick={() => downloadCard(card)}
                title="Download SVG"
                className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-700 shrink-0"
              >↓</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
