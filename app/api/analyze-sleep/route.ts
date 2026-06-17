import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { hours, hrv, quality } = await req.json()

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Analysiere diese Schlafdaten auf Deutsch kurz und präzise (max 2 Sätze):
Schlafdauer: ${hours} Stunden
HRV morgens: ${hrv || 'nicht gemessen'} ms
Schlafqualität (subjektiv): ${quality}/10

Gib eine Einschätzung der Schlafqualität und einen konkreten Tipp. Antworte nur mit dem Kommentar, ohne Einleitung.`,
      }],
    })

    const comment = (msg.content[0] as { type: string; text: string }).text.trim()
    const score = calcScore(hours, hrv, quality)
    return NextResponse.json({ score, comment })
  } catch {
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 })
  }
}

function calcScore(hours: number, hrv: number, quality: number): number {
  const hScore = Math.min(hours / 8 * 35, 35)
  const hScore2 = hours > 9 ? Math.max(0, 35 - (hours - 9) * 5) : hScore
  const hrvScore = hrv > 0 ? Math.min(hrv / 70 * 30, 30) : 15
  const qScore = (quality / 10) * 35
  return Math.round(Math.min(10, (hScore2 + hrvScore + qScore) / 10))
}
