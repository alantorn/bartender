'use client'

import type { ChartConfig } from '@/lib/types'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'

interface Props {
  config: ChartConfig | null
  onChange: (patch: Partial<ChartConfig>) => void
  onClose: () => void
}

function Field({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}) {
  function clamp(v: number) {
    if (min !== undefined && v < min) return min
    if (max !== undefined && v > max) return max
    return v
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-xs text-zinc-400 leading-tight">{label}</span>
      <div className="flex items-center rounded border border-zinc-700 bg-zinc-800 overflow-hidden">
        <button
          onClick={() => onChange(clamp(value - step))}
          disabled={min !== undefined && value <= min}
          className="px-1.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="w-3 h-3" />
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(clamp(Number(e.target.value)))}
          className="w-12 bg-transparent px-1 py-0.5 text-xs text-zinc-100 text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => onChange(clamp(value + step))}
          disabled={max !== undefined && value >= max}
          className="px-1.5 py-1 text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

function Group({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

export default function ChartStylePanel({ config, onChange, onClose }: Props) {
  if (!config) return null

  const f = <K extends keyof ChartConfig>(key: K) =>
    (v: number) => onChange({ [key]: v } as Partial<ChartConfig>)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-zinc-700/50">
        <span className="text-sm font-medium text-zinc-200">Style</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Close style panel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <Group title="Chart size">
          <Field label="Width"  value={config.chartWidth}  onChange={f('chartWidth')}  min={100} max={2000} />
          <Field label="Height" value={config.chartHeight} onChange={f('chartHeight')} min={100} max={2000} />
        </Group>
        <Group title="Bars">
          <Field label="Bar width"       value={config.barWidth}            onChange={f('barWidth')}            min={1}  max={200} />
          <Field label="Padding inner"   value={config.barPaddingInner}     onChange={f('barPaddingInner')}     min={0}  max={50}  />
          <Field label="Cluster padding" value={config.clusterPaddingInner} onChange={f('clusterPaddingInner')} min={0}  max={1}   step={0.05} />
          <Field label="Border radius"   value={config.barBorderRadius}     onChange={f('barBorderRadius')}     min={0}  max={20}  />
          <Field label="Border width"    value={config.barBorderWidth}      onChange={f('barBorderWidth')}      min={0}  max={10}  />
        </Group>
        <Group title="Padding">
          <Field label="Top"    value={config.paddingTop}    onChange={f('paddingTop')}    min={0} max={200} />
          <Field label="Bottom" value={config.paddingBottom} onChange={f('paddingBottom')} min={0} max={200} />
          <Field label="Left"   value={config.paddingLeft}   onChange={f('paddingLeft')}   min={0} max={200} />
          <Field label="Right"  value={config.paddingRight}  onChange={f('paddingRight')}  min={0} max={200} />
        </Group>
        <Group title="Gaps">
          <Field label="Card gap"    value={config.cardGap}    onChange={f('cardGap')}    min={0} max={200} />
          <Field label="Section gap" value={config.sectionGap} onChange={f('sectionGap')} min={0} max={200} />
        </Group>
      </div>
    </div>
  )
}