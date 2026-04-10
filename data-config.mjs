/**
 * data-config.mjs
 * Defines datasets, file patterns, group/column mappings, and page metadata.
 * Edit this file to add datasets or point at different CSVs/XLSX — no changes to the
 * generator are needed.
 *
 * Dataset types
 * ───────────
 *   'asr'  → one chart per (metric × category × group).
 *            source:'csv'  → files resolved via filePattern with {group} and {fileKey}.
 *            source:'xlsx' → sheets resolved via sheetPattern with {group} and {fileKey},
 *                            read from input/input.xlsx.
 *
 *   'clustered' → one clustered-bar chart (categories on x, series as xOffset).
 *            source:'csv'  → single file relative to data/.
 *            source:'xlsx' → sheet name given by the 'sheet' key, read from the xlsxFile.
 *
 * Both source types use the same column/model mappings and parsers.
 */

// ── Page-level metadata ───────────────────────────────────────────────────────
export const PAGE = {
  title:    'Chart Reference \u2014 Arabic ASR & LLM Evaluation',
  subtitle: 'Visual reference only \u00b7 Lower WER\u00a0=\u00a0better',
}

// ── Datasets ──────────────────────────────────────────────────────────────────
export const DATASETS = [
  // ── Arabic ASR ──────────────────────────────────────────────────────────────
  {
    type: 'asr',
    id:          'arabic-asr',
    tag:         'Arabic ASR',
    sectionTitle: 'Arabic ASR',
    yTitle:      'WER (%)',

    source:        'xlsx',
    sheetPattern:  '{group} - {fileKey}',  // resolves to e.g. "Chami - Age"
    xlsxFile:      'asr-eval-full-after-revision.xlsx',  // relative to data/

    // Each key is a group (dialect) name.
    // Each modelDef: col (CSV/sheet column header), label (display name), color.
    //   color.bg     — bar fill  (any CSS color string)
    //   color.border — bar label text color + bar stroke if borderWidth > 0
    groups: {
      Chami: [
        { col: 'google1', label: 'Google',  color: { bg: 'rgba(189,228,202,0.82)', border: '#004918' } },
        { col: 'aws',     label: 'AWS',     color: { bg: 'rgba(255,181,133,0.82)', border: '#612700' } },
        { col: 'azure1',  label: 'Azure',   color: { bg: 'rgba(179,211,255,0.82)', border: '#0a70ff' } },
        { col: 'whisper', label: 'Whisper', color: { bg: 'rgba(240,215,255,0.82)', border: '#a811ff' } },
      ],
      Egyptian: [
        { col: 'google',  label: 'Google',  color: { bg: 'rgba(189,228,202,0.82)', border: '#004918' } },
        { col: 'aws',     label: 'AWS',     color: { bg: 'rgba(255,181,133,0.82)', border: '#612700' } },
        { col: 'azure',   label: 'Azure',   color: { bg: 'rgba(179,211,255,0.82)', border: '#0a70ff' } },
        { col: 'whisper', label: 'Whisper', color: { bg: 'rgba(240,215,255,0.82)', border: '#a811ff' } },
      ],
      Hijazi: [
        { col: 'aws',     label: 'AWS',     color: { bg: 'rgba(255,181,133,0.82)', border: '#612700' } },
        { col: 'azure',   label: 'Azure',   color: { bg: 'rgba(179,211,255,0.82)', border: '#0a70ff' } },
        { col: 'whisper', label: 'Whisper', color: { bg: 'rgba(240,215,255,0.82)', border: '#a811ff' } },
      ],
      Najdi: [
        { col: 'google',  label: 'Google',  color: { bg: 'rgba(189,228,202,0.82)', border: '#004918' } },
        { col: 'aws',     label: 'AWS',     color: { bg: 'rgba(255,181,133,0.82)', border: '#612700' } },
        { col: 'azure',   label: 'Azure',   color: { bg: 'rgba(179,211,255,0.82)', border: '#0a70ff' } },
        { col: 'whisper', label: 'Whisper', color: { bg: 'rgba(240,215,255,0.82)', border: '#a811ff' } },
      ],
    },

    // Each metric maps a display label to the fileKey token used in sheetPattern.
    metrics: [
      { label: 'Speaker Age',         fileKey: 'Age'                },
      { label: 'Speaker Gender',      fileKey: 'Gender'             },
      { label: 'Segment Environment', fileKey: 'segment environment' },
    ],
  },

  // ── Example clustered chart ────────────────────────────────────────────────────
  // Uncomment and fill in once data is available.
  // {
  //   type: 'clustered',
  //   id:           'arabic-llm',
  //   tag:          'Arabic',
  //   sectionTitle: 'Arabic LLM Evaluation',
  //   yTitle:       'Score',
  //   source:       'xlsx',
  //   xlsxFile:     'asr-eval-full-after-revision.xlsx',
  //   sheet:        'Sheet name here',
  //   // seriesColors: keyed by exact series label as it appears in the data.
  //   // Series not listed here get a grey fallback.
  //   seriesColors: {
  //     'ALLaM 7B':   { bg: 'rgba(251,191,36,1)',  border: '#FBBF24' },
  //     'ALLaM 13B':  { bg: 'rgba(249,115,22,1)',  border: '#F97316' },
  //     'Command R+': { bg: 'rgba(20,184,166,1)',  border: '#14B8A6' },
  //     'Deepseek V3':{ bg: 'rgba(239,68,68,1)',   border: '#EF4444' },
  //   },
  // },
]

