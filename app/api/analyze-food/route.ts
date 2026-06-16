import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json()
    const base64 = image.replace(/^data:image\/\w+;base64,/, '')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `Analysiere diese Mahlzeit und schätze die Nährwerte. Antworte NUR mit diesem JSON-Format, keine Erklärung:
{"name":"Mahlzeit-Name","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":"hoch/mittel/niedrig"}
Alle Werte in Gramm außer Kalorien (kcal). Wenn kein Essen erkennbar, setze alle Werte auf 0 und confidence auf "niedrig".`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}')
    return NextResponse.json(json)
  } catch (error) {
    console.error('Food analysis error:', error)
    return NextResponse.json({ error: 'Analyse fehlgeschlagen' }, { status: 500 })
  }
}
