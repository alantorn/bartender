// Single source of truth for all model/brand colors.
// Used by generate-charts.mjs (Chart.js) and written out to model-colors.css.

export const MODEL_COLORS = {
  google: { hex: '#004918', rgb: '189, 228, 202' },
  aws: { hex: '#612700', rgb: '255, 181, 133' },
  azure: { hex: '#0a70ff', rgb: '179, 211, 255' },
  whisper: { hex: '#a811ff', rgb: '240, 215, 255' },
}

export const LLM_COLORS = [
  { hex: '#FBBF24', rgb: '251,191,36' }, // ALLaM 7B
  { hex: '#F97316', rgb: '249,115,22' }, // ALLaM 13B
  { hex: '#14B8A6', rgb: '20,184,166' }, // Command R+
  { hex: '#EF4444', rgb: '239,68,68' }, // Deepseek V3
]

// Maps every model label to its brand bucket
export const LABEL_TO_BRAND = {
  Google: 'google',
  'Google (LB)': 'google',
  'Google (EG)': 'google',
  'Google (SA)': 'google',
  AWS: 'aws',
  'AWS (MSA)': 'aws',
  Azure: 'azure',
  'Azure (LB)': 'azure',
  'Azure (EG)': 'azure',
  'Azure (SA)': 'azure',
  Whisper: 'whisper',
}

export const CHART_ALPHA = 0.82

// Returns { bg, border } ready for Chart.js
export function modelChartColor(label) {
  const brand = LABEL_TO_BRAND[label]
  const c = brand ? MODEL_COLORS[brand] : null
  if (!c) return { bg: 'rgba(180,180,180,0.7)', border: '#aaa' }
  return {
    bg: `rgba(${c.rgb},${CHART_ALPHA})`,
    border: c.hex,
  }
}
