'use client'

import type { ChartConfig } from '@/lib/types'

// ─── field descriptor ────────────────────────────────────────────────────────
type FieldType = 'number' | 'text' | 'toggle' | 'color'

interface Field {
  key:     keyof ChartConfig
  label:   string
  type:    FieldType
  step?:   number
  min?:    number
  max?:    number
}

interface Section { title: string; fields: Field[] }

const SECTIONS: Section[] = [
  {
    title: 'Chart size',
    fields: [
      { key: 'chartWidth',           label: 'ASR chart width',        type: 'number', min: 100, step: 10 },
      { key: 'chartHeight',          label: 'ASR chart height',       type: 'number', min: 100, step: 10 },
      { key: 'clusteredChartWidth',  label: 'Clustered chart width',  type: 'number', min: 100, step: 10 },
      { key: 'clusteredChartHeight', label: 'Clustered chart height', type: 'number', min: 100, step: 10 },
      { key: 'svgWidth',             label: 'SVG card width (null=auto)',  type: 'number', min: 0, step: 10 },
      { key: 'svgHeight',            label: 'SVG card height (null=auto)', type: 'number', min: 0, step: 10 },
    ],
  },
  {
    title: 'Bars',
    fields: [
      { key: 'barWidth',         label: 'Bar width px',      type: 'number', min: 2, step: 1 },
      { key: 'barPaddingInner',  label: 'Inner padding 0–1', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'barBorderRadius',  label: 'Border radius',     type: 'number', min: 0, step: 1 },
      { key: 'barBorderWidth',   label: 'Border width',      type: 'number', min: 0, step: 0.5 },
      { key: 'paddingTop',       label: 'Padding top',       type: 'number', min: 0, step: 4 },
      { key: 'paddingBottom',    label: 'Padding bottom',    type: 'number', min: 0, step: 4 },
    ],
  },
  {
    title: 'Value labels (above bars)',
    fields: [
      { key: 'dataLabelSize',     label: 'Font size',   type: 'number', min: 8,  step: 1 },
      { key: 'dataLabelWeight',   label: 'Font weight', type: 'text' },
      { key: 'dataLabelColor',    label: 'Color',       type: 'color' },
      { key: 'dataLabelDecimals', label: 'Decimals',    type: 'number', min: 0, max: 4, step: 1 },
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
      { key: 'showYTitle',      label: 'Show Y title',      type: 'toggle' },
      { key: 'showYTickLabels', label: 'Show tick labels',  type: 'toggle' },
      { key: 'axisTickSize',    label: 'Tick font size',    type: 'number', min: 8, step: 1 },
      { key: 'axisTickWeight',  label: 'Tick font weight',  type: 'text' },
      { key: 'axisTickColor',   label: 'Tick color',        type: 'color' },
      { key: 'yTitleSize',      label: 'Title font size',   type: 'number', min: 8, step: 1 },
      { key: 'yTitleWeight',    label: 'Title font weight', type: 'text' },
      { key: 'yTitleColor',     label: 'Title color',       type: 'color' },
      { key: 'yTitleAlign',     label: 'Title align',       type: 'text' },
      { key: 'yTitleY',         label: 'Title Y offset',    type: 'number', step: 1 },
    ],
  },
  {
    title: 'Card header',
    fields: [
      { key: 'cardTagSize',          label: 'Tag size',           type: 'number', min: 8, step: 1 },
      { key: 'cardTagWeight',        label: 'Tag weight',         type: 'text' },
      { key: 'cardTagColor',         label: 'Tag color',          type: 'color' },
      { key: 'cardCategorySize',     label: 'Category size',      type: 'number', min: 8, step: 1 },
      { key: 'cardCategoryWeight',   label: 'Category weight',    type: 'text' },
      { key: 'cardCategoryColor',    label: 'Category color',     type: 'color' },
      { key: 'cardDialectSize',      label: 'Dialect size',       type: 'number', min: 8, step: 1 },
      { key: 'cardDialectWeight',    label: 'Dialect weight',     type: 'text' },
      { key: 'cardDialectColor',     label: 'Dialect color',      type: 'color' },
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
            {sec.fields.map(({ key, label, type, step, min, max }) => {
              const val = config[key]
              return (
                <label key={key} className="flex flex-col gap-0.5">
                  <span className="text-neutral-500 text-xs">{label}</span>
                  {type === 'toggle' ? (
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
