/**
 * data-config.mjs
 * Defines datasets, file patterns, group/column mappings, and page metadata.
 * Edit this file to add datasets or point at different CSVs — no changes to the
 * generator are needed.
 *
 * Dataset types
 * ─────────────
 *   'asr'  → one chart per (metric × category × group).
 *            Files are resolved via filePattern with {group} and {fileKey}.
 *            Each group lists the model columns present in its CSV.
 *
 *   'llm'  → one grouped-bar chart (categories on x, models as xOffset).
 *            Single file, relative to the data/ directory.
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

    // {group} → dialect name, {fileKey} → metric file key
    filePattern: 'Arabic ASR-full_{group} - {fileKey}.csv',

    // Each key is a group (dialect) name.
    // The value lists the model columns present in that group's CSV files.
    // The order here determines left-to-right bar order on the chart.
    groups: {
      Chami: [
        { col: 'google1', label: 'Google'  },
        { col: 'aws',     label: 'AWS'     },
        { col: 'azure1',  label: 'Azure'   },
        { col: 'whisper', label: 'Whisper' },
      ],
      Egyptian: [
        { col: 'google',  label: 'Google'  },
        { col: 'aws',     label: 'AWS'     },
        { col: 'azure',   label: 'Azure'   },
        { col: 'whisper', label: 'Whisper' },
      ],
      Hijazi: [
        { col: 'aws',     label: 'AWS'     },
        { col: 'azure',   label: 'Azure'   },
        { col: 'whisper', label: 'Whisper' },
      ],
      Najdi: [
        { col: 'google',  label: 'Google'  },
        { col: 'aws',     label: 'AWS'     },
        { col: 'azure',   label: 'Azure'   },
        { col: 'whisper', label: 'Whisper' },
      ],
    },

    // Each metric maps a display label to the fileKey token used in filePattern.
    metrics: [
      { label: 'Speaker Age',         fileKey: 'Age'                },
      { label: 'Speaker Gender',      fileKey: 'Gender'             },
      { label: 'Segment Environment', fileKey: 'segment environment' },
    ],
  },

  // ── Arabic LLM Evaluation ───────────────────────────────────────────────────
  {
    type: 'llm',
    id:           'arabic-llm',
    tag:          'Arabic',
    sectionTitle: 'Arabic LLM Evaluation',
    yTitle:       'Score',

    // File path relative to data/
    file: 'axis/Arabic LLM Evaluation - Sheet11.csv',
  },
]
