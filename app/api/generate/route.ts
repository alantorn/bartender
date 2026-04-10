/**
 * /api/generate — POST
 * Accepts multipart FormData:
 *   files.<datasetId>  : File  (xlsx or csv)
 *   config             : JSON string (partial ChartConfig override, optional)
 *   datasets           : JSON string (Dataset[] to process, optional — defaults to empty, UI must supply)
 * Returns: { cards: GeneratedCard[] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateCards }             from '@/lib/generator'
import { DEFAULT_CONFIG }            from '@/lib/defaults'
import type { Dataset, ChartConfig } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const form     = await req.formData()
    const cfgRaw   = form.get('config')   as string | null
    const dsRaw    = form.get('datasets') as string | null

    if (!dsRaw) {
      return NextResponse.json({ error: 'Missing "datasets" field' }, { status: 400 })
    }

    const datasets:  Dataset[]    = JSON.parse(dsRaw)
    const configOverride: Partial<ChartConfig> = cfgRaw ? JSON.parse(cfgRaw) : {}
    const config = { ...DEFAULT_CONFIG, ...configOverride }

    // Collect uploaded file buffers keyed by dataset id
    const files: Record<string, Buffer> = {}
    for (const dataset of datasets) {
      const file = form.get(`files.${dataset.id}`) as File | null
      if (!file) throw new Error(`Missing file for dataset "${dataset.id}"`)
      const ab = await file.arrayBuffer()
      files[dataset.id] = Buffer.from(ab)
    }

    const cards = await generateCards(datasets, config, files)
    return NextResponse.json({ cards })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
