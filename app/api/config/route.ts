/**
 * /api/config
 * GET  → returns the current merged ChartConfig (defaults + any saved override)
 * POST → saves a partial override to studio/config.json; returns merged config
 */
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { DEFAULT_CONFIG } from '@/lib/defaults'
import type { ChartConfig } from '@/lib/types'

const CONFIG_PATH = join(process.cwd(), 'config.json')

function loadOverride(): Partial<ChartConfig> {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

export function GET() {
  const override = loadOverride()
  const merged   = { ...DEFAULT_CONFIG, ...override }
  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  try {
    const body: Partial<ChartConfig> = await req.json()
    writeFileSync(CONFIG_PATH, JSON.stringify(body, null, 2), 'utf-8')
    const merged = { ...DEFAULT_CONFIG, ...body }
    return NextResponse.json(merged)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
