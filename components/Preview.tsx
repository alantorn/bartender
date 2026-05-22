'use client'

import { useState } from 'react'
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
  onDownload?:          () => void
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

const FigmaIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/>
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/>
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/>
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/>
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/>
  </svg>
)

export default function Preview({ cards, loading, error, datasetsJson, onDatasetsJsonChange, onDownload }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function copyCard(card: GeneratedCard) {
    await navigator.clipboard.writeText(card.svgData)
    setCopiedId(card.id)
    setTimeout(() => setCopiedId(null), 1500)
  }
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
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          className="self-end rounded px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Download all
        </button>
      )}
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
                onClick={() => copyCard(card)}
                title="Copy SVG for Figma"
                className={`flex items-center px-1.5 py-0.5 rounded transition-colors shrink-0 ${copiedId === card.id ? 'text-green-400 bg-green-950/40' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700'}`}
              ><FigmaIcon /></button>
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
