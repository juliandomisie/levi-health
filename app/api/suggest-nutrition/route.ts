import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { food } = await req.json()
    if (!food) return NextResponse.json({ error: 'No food' }, { status: 400 })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Schätze die Nährwerte für: "${food}"

Antworte NUR mit gültigem JSON, kein Text davor/danach:
{"name":"...","calories":0,"protein":0,"carbs":0,"fat":0}

Regeln:
- name: kurzer Produktname auf Deutsch
- Alle Werte gerundet auf ganze Zahlen
- Wenn eine Menge angegeben ist (z.B. "200g", "1 Banane"), berechne für genau diese Menge
- Falls keine Menge: nimm 100g als Standard`,
      }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return NextResponse.json(json)
  } catch {
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 })
  }
}
