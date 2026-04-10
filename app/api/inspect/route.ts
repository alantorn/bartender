/**
 * /api/inspect — POST
 * Accepts: FormData with `file` (xlsx)
 * Returns: InspectResult — auto-detected dataset structure (one sheet = one chart)
 */
import { NextRequest, NextResponse } from 'next/server'
import { inspectXlsx } from '@/lib/inspect'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const ab     = await file.arrayBuffer()
    const buffer = Buffer.from(ab)
    const result = inspectXlsx(buffer)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
