/**
 * /api/download — POST
 * Same body as /api/generate.
 * Returns: application/zip containing all SVG cards.
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateCards }             from '@/lib/generator'
import { DEFAULT_CONFIG }            from '@/lib/defaults'
import type { Dataset, ChartConfig } from '@/lib/types'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const JSZip = require('jszip') as typeof import('jszip')

export async function POST(req: NextRequest) {
  try {
    const form   = await req.formData()
    const cfgRaw = form.get('config')   as string | null
    const dsRaw  = form.get('datasets') as string | null

    if (!dsRaw) {
      return NextResponse.json({ error: 'Missing "datasets" field' }, { status: 400 })
    }

    const datasets: Dataset[] = JSON.parse(dsRaw)
    const configOverride: Partial<ChartConfig> = cfgRaw ? JSON.parse(cfgRaw) : {}
    const config = { ...DEFAULT_CONFIG, ...configOverride }

    const files: Record<string, Buffer> = {}
    for (const dataset of datasets) {
      const file = form.get(`files.${dataset.id}`) as File | null
      if (!file) throw new Error(`Missing file for dataset "${dataset.id}"`)
      const ab = await file.arrayBuffer()
      files[dataset.id] = Buffer.from(ab)
    }

    const cards = await generateCards(datasets, config, files)

    const zip = new JSZip()
    for (const card of cards) {
      zip.file(`${card.id}.svg`, card.svgData)
    }
    const zipBuffer: Buffer = await zip.generateAsync({ type: 'nodebuffer' })

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type':        'application/zip',
        'Content-Disposition': 'attachment; filename="charts.zip"',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
