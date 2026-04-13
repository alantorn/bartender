'use client'

import type { ChartConfig } from '@/lib/types'

// ─── field descriptor ────────────────────────────────────────────────────────
type FieldType = 'number' | 'text' | 'toggle' | 'color' | 'select'

interface Field {
  key:      keyof ChartConfig
  label:    string
  type:     FieldType
  step?:    number
  min?:     number
  max?:     number
  options?: { value: string; label: string }[]
}

interface Section { title: string; fields: Field[] }

const SECTIONS: Section[] = [
  {
    title: 'Chart size',
    fields: [
      { key: 'chartWidth',           label: 'Chart width',              type: 'number', min: 100, step: 10 },
      { key: 'chartHeight',          label: 'Chart height',             type: 'number', min: 100, step: 10 },
      { key: 'clusteredChartWidth',  label: 'Clustered CSV chart width',  type: 'number', min: 100, step: 10 },
      { key: 'clusteredChartHeight', label: 'Clustered CSV chart height', type: 'number', min: 100, step: 10 },
      { key: 'svgWidth',             label: 'SVG card width',           type: 'number', min: 0, step: 10 },
      { key: 'svgHeight',            label: 'SVG card height',          type: 'number', min: 0, step: 10 },
    ],
  },
  {
    title: 'Bars',
    fields: [
      { key: 'barWidth',            label: 'Bar width',              type: 'number', min: 2, step: 1 },
      { key: 'barBorderRadius',     label: 'Bar border radius',      type: 'number', min: 0, step: 1 },
      { key: 'barBorderWidth',      label: 'Bar border width',       type: 'number', min: 0, step: 0.5 },
      { key: 'clusterStep',         label: 'Group step px (empty=auto)', type: 'number', min: 0, step: 5 },
      { key: 'clusterPaddingInner', label: 'Group gap 0–1',          type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'barPaddingInner',     label: 'Bar gap within group 0–1', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'barSortOrder',        label: 'Bar sort order',         type: 'select',
        options: [
          { value: 'none',       label: 'As imported' },
          { value: 'ascending',  label: 'A → Z' },
          { value: 'descending', label: 'Z → A' },
        ],
      },
    ],
  },
  {
    title: 'Padding',
    fields: [
      { key: 'paddingTop',    label: 'Padding top',    type: 'number', min: 0, step: 4 },
      { key: 'paddingBottom', label: 'Padding bottom', type: 'number', min: 0, step: 4 },
      { key: 'paddingLeft',   label: 'Padding left',   type: 'number', min: 0, step: 4 },
      { key: 'paddingRight',  label: 'Padding right',  type: 'number', min: 0, step: 4 },
    ],
  },
  {
    title: 'Value labels (above bars)',
    fields: [
      { key: 'dataLabelSize',     label: 'Font size',     type: 'number', min: 8, step: 1 },
      { key: 'dataLabelWeight',   label: 'Font weight',   type: 'text' },
      { key: 'dataLabelColor',    label: 'Color',         type: 'color' },
      { key: 'dataLabelDecimals', label: 'Decimals',      type: 'number', min: 0, max: 4, step: 1 },
    ],
  },
  {
    title: 'Bar name labels (below axis)',
    fields: [
      { key: 'barLabelSize',       label: 'Font size',   type: 'number', min: 8, step: 1 },
      { key: 'barLabelWeight',     label: 'Font weight', type: 'text' },
      { key: 'barLabelOffsetY',    label: 'Offset Y',    type: 'number', step: 1 },
      { key: 'barLabelPaddingTop', label: 'Padding top', type: 'number', min: 0, step: 1 },
    ],
  },
  {
    title: 'Y axis',
    fields: [
      { key: 'showYTitle',        label: 'Show Y title',        type: 'toggle' },
      { key: 'showYTickLabels',   label: 'Show tick labels',    type: 'toggle' },
      { key: 'showXDomain',       label: 'Show X axis line',    type: 'toggle' },
      { key: 'showClusterLabels', label: 'Show cluster names',  type: 'toggle' },
      { key: 'showN',             label: 'Show n= count',       type: 'toggle' },
      { key: 'nLabelSize',        label: 'n= font size',        type: 'number', min: 8, step: 1 },
      { key: 'nLabelColor',       label: 'n= color',            type: 'color' },
      { key: 'axisTickSize',        label: 'Tick font size',        type: 'number', min: 8, step: 1 },
      { key: 'axisTickWeight',       label: 'Tick font weight',      type: 'text' },
      { key: 'axisTickColor',        label: 'Tick color',            type: 'color' },
      { key: 'yAxisLabelPadding',    label: 'Y axis label padding',  type: 'number', min: 0, step: 1 },
      { key: 'yTitleSize',        label: 'Y title font size',   type: 'number', min: 8, step: 1 },
      { key: 'yTitleWeight',      label: 'Y title font weight', type: 'text' },
      { key: 'yTitleColor',       label: 'Y title color',       type: 'color' },
      { key: 'yTitleAlign',       label: 'Y title align',       type: 'text' },
      { key: 'yTitleY',           label: 'Y title offset Y',    type: 'number', step: 1 },
    ],
  },
  {
    title: 'Card header',
    fields: [
      { key: 'cardHeaderHeight',   label: 'Card header height',   type: 'number', min: 0,  step: 4 },
      { key: 'cardHeaderPaddingX', label: 'Card header padding X', type: 'number', min: 0,  step: 1 },
      { key: 'cardLine1Y',         label: 'Line 1 Y',             type: 'number', min: 0,  step: 1 },
      { key: 'cardLineGap',        label: 'Line gap',             type: 'number', min: 0,  step: 1 },
      { key: 'cardTagSize',        label: 'Tag font size',    type: 'number', min: 8, step: 1 },
      { key: 'cardTagWeight',      label: 'Tag font weight',  type: 'text' },
      { key: 'cardTagColor',       label: 'Tag color',        type: 'color' },
      { key: 'cardCategorySize',   label: 'Line 1 font size', type: 'number', min: 8, step: 1 },
      { key: 'cardCategoryWeight', label: 'Line 1 font weight', type: 'text' },
      { key: 'cardCategoryColor',  label: 'Line 1 color',     type: 'color' },
      { key: 'cardDialectSize',    label: 'Line 2 font size', type: 'number', min: 8, step: 1 },
      { key: 'cardDialectWeight',  label: 'Line 2 font weight', type: 'text' },
      { key: 'cardDialectColor',   label: 'Line 2 color',     type: 'color' },
    ],
  },
  {
    title: 'Colors',
    fields: [
      { key: 'cardBg',   label: 'Card background', type: 'color' },
      { key: 'pageBg',   label: 'Page background', type: 'color' },
      { key: 'pageText', label: 'Page text',        type: 'color' },
    ],
  },
  {
    title: 'Typography',
    fields: [
      { key: 'fontSans', label: 'Sans font name', type: 'text' },
      { key: 'fontMono', label: 'Mono font name', type: 'text' },
    ],
  },
  {
    title: 'Debug',
    fields: [
      { key: 'showLayoutDiagram', label: 'Show layout diagram (first card)', type: 'toggle' },
    ],
  },
]

// ─── component ───────────────────────────────────────────────────────────────
interface Props {
  config:   ChartConfig
  onChange: (patch: Partial<ChartConfig>) => void
}

export default function ConfigEditor({ config, onChange }: Props) {
  function patch(key: keyof ChartConfig, raw: string | boolean) {
    const existing = config[key]
    let value: unknown = raw
    if (typeof existing === 'number' || existing === null) {
      const n = parseFloat(raw as string)
      value = isNaN(n) ? null : n
    } else if (typeof existing === 'boolean') {
      value = raw
    }
    onChange({ [key]: value } as Partial<ChartConfig>)
  }

  return (
    <div className="space-y-6 text-sm">
      {SECTIONS.map(sec => (
        <section key={sec.title}>
          <h3 className="font-semibold text-neutral-500 uppercase tracking-wide text-xs mb-2 pb-1 border-b border-neutral-200">
            {sec.title}
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {sec.fields.map(({ key, label, type, step, min, max, options }) => {
              const val = config[key]
              return (
                <label key={key} className="flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-xs">{label}</span>
                  {type === 'select' ? (
                    <select
                      value={String(val)}
                      onChange={e => patch(key, e.target.value)}
                      className="border border-neutral-200 rounded px-1.5 py-0.5 text-xs w-full"
                    >
                      {options?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : type === 'toggle' ? (
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={e => patch(key, e.target.checked)}
                      className="h-4 w-4 accent-blue-500"
                    />
                  ) : type === 'color' ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={(val as string) || '#000000'}
                        onChange={e => patch(key, e.target.value)}
                        className="h-6 w-10 rounded border border-neutral-200 p-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={(val as string) || ''}
                        onChange={e => patch(key, e.target.value)}
                        className="flex-1 border border-neutral-200 rounded px-1.5 py-0.5 font-mono text-xs"
                      />
                    </div>
                  ) : (
                    <input
                      type={type === 'number' ? 'number' : 'text'}
                      value={val === null ? '' : String(val)}
                      step={step}
                      min={min}
                      max={max}
                      onChange={e => patch(key, e.target.value)}
                      className="border border-neutral-200 rounded px-1.5 py-0.5 font-mono text-xs w-full"
                    />
                  )}
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
