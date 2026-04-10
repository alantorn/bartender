/**
 * inspect.ts
 * Auto-detect dataset structure from an uploaded xlsx file.
 * Returns a Dataset ready to use — no manual config needed.
 */
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx'
import { AUTO_COLORS } from './generator'
import type { ASRDataset, ModelDef } from './types'

/**
 * Parse a sheet name against a pattern like "{group} - {fileKey}".
 * Returns a map of token→value, or null if no match.
 */
function parseSheetPattern(pattern: string, sheetName: string): Record<string, string> | null {
  const tokens: string[] = []
  const parts = pattern.split(/\{(\w+)\}/)
  // parts alternates: literal, tokenName, literal, tokenName, ...
  let regexStr = ''
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // literal — escape for regex
      regexStr += parts[i].replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
    } else {
      tokens.push(parts[i])
      // last capture group is greedy so it can contain any remaining text
      regexStr += i === parts.length - 2 ? '(.+)' : '(.+?)'
    }
  }
  const m = sheetName.match(new RegExp('^' + regexStr + '$'))
  if (!m) return null
  const result: Record<string, string> = {}
  tokens.forEach((t, i) => { result[t] = m[i + 1].trim() })
  return result
}

/** Read column headers from a sheet, skipping the first (category) column. */
function sheetModelCols(wb: ReturnType<typeof xlsxRead>, sheetName: string): string[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const csv     = xlsxUtils.sheet_to_csv(ws)
  const headers = csv.split(/\r?\n/)[0].split(',')
  return headers.slice(1).map(s => s.trim()).filter(Boolean)
}

export interface InspectResult {
  dataset:   ASRDataset
  groups:    string[]   // detected group names
  fileKeys:  string[]   // detected metric keys
  colCounts: Record<string, number>  // group → number of model columns
}

export function inspectXlsx(buffer: Buffer, sheetPattern: string): InspectResult {
  const wb = xlsxRead(buffer, { type: 'buffer' })

  // Match every sheet name against the pattern
  const matched: { group: string; fileKey: string; sheetName: string }[] = []
  for (const sheetName of wb.SheetNames) {
    const tokens = parseSheetPattern(sheetPattern, sheetName)
    if (tokens?.group && tokens?.fileKey) {
      matched.push({ group: tokens.group, fileKey: tokens.fileKey, sheetName })
    }
  }

  if (matched.length === 0) {
    throw new Error(
      `No sheets matched pattern "${sheetPattern}".\n` +
      `Available sheets: ${wb.SheetNames.join(', ')}`
    )
  }

  // Unique ordered groups and fileKeys (preserve sheet order)
  const groups   = [...new Set(matched.map(m => m.group))]
  const fileKeys = [...new Set(matched.map(m => m.fileKey))]

  // For each group, read column headers from its first sheet
  const groupDefs: Record<string, ModelDef[]> = {}
  const colCounts: Record<string, number>      = {}
  for (const group of groups) {
    const first = matched.find(m => m.group === group)!
    const cols  = sheetModelCols(wb, first.sheetName)
    colCounts[group] = cols.length
    groupDefs[group] = cols.map((col, i) => ({
      col,
      // no label — generator falls back to col (the actual column name)
      color: AUTO_COLORS[i % AUTO_COLORS.length],
    }))
  }

  const dataset: ASRDataset = {
    type:         'asr',
    id:           'dataset',
    tag:          'Dataset',
    sectionTitle: 'Dataset',
    yTitle:       'Value',
    source:       'xlsx',
    sheetPattern,
    groups:       groupDefs,
    metrics:      fileKeys.map(fk => ({ label: fk, fileKey: fk })),
  }

  return { dataset, groups, fileKeys, colCounts }
}
