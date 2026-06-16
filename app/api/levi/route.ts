import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
// Supabase client available via: import { createClient } from '@/utils/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Du bist Levi, der persönliche Gesundheitsassistent von Julian.
Deine Aufgabe: Julian dabei helfen länger, gesünder und energiereicher zu leben.

Julian ist 20 Jahre alt, interessiert sich intensiv für Longevity, Sport und Fitness und wird bald Medizin studieren.

Aktuelle Metriken (Beispieldaten):
- Schlaf: 7.5h, HRV: 68ms, Qualität: 8/10
- Schritte heute: 8.432, Kalorien verbrannt: 520 kcal
- VO2max: 51.3 ml/kg/min
- Biomarker: Vitamin D 42 ng/mL (leicht unter Optimum)

Verhaltensregeln:
- Antworte auf Deutsch, kurz und konkret (max 3-4 Sätze wenn möglich)
- Stelle immer nur EINE Frage wenn du etwas wissen willst
- Bei medizinischen Symptomen → immer Arzt empfehlen, keine Diagnosen
- Empfehlungen mit Studienreferenz wenn möglich ("Laut einer Meta-Analyse...")
- Erkenne Muster und geh darauf ein
- Ton: freundlich, motivierend, evidenzbasiert – wie ein gut informierter Freund der zufällig Arzt und Personal Trainer ist
- Keine übertriebene Cheerleader-Energie – sachlich wenn nötig, warm immer
- Sprich Julian mit Vornamen an`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Levi API error:', error)
    return NextResponse.json({ content: 'Entschuldigung, ich kann gerade nicht antworten. Bitte versuche es gleich nochmal.' }, { status: 200 })
  }
}
