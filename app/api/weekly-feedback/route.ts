import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:admin@levi-health.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-push-secret')
  if (secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { snapshots } = await req.json()

  let feedback = 'Gute Woche! Weiter so — Konsistenz ist der Schlüssel zu langfristiger Gesundheit.'

  if (snapshots?.length > 0) {
    try {
      const summary = snapshots.map((s: Record<string, number>, i: number) =>
        `Tag ${i + 1}: Schlaf ${s.sleep_hours?.toFixed(1) ?? '?'}h, HRV ${s.hrv?.toFixed(1) ?? '?'}ms, Schritte ${s.steps ?? '?'}`
      ).join('\n')

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Du bist Levi, ein freundlicher Gesundheitscoach. Gib kurzes wöchentliches Feedback (2-3 Sätze) auf Deutsch basierend auf diesen Daten:\n${summary}\n\nNur den Feedback-Text, kein "Levi:" davor.`,
        }],
      })
      feedback = (msg.content[0] as { type: string; text: string }).text.trim()
    } catch { /* use default */ }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  let sent = 0

  for (const row of subs ?? []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify({
        title: '📊 Dein Wochen-Check-in von Levi',
        body: feedback,
        tag: 'weekly',
      }))
      sent++
    } catch { /* skip stale subs */ }
  }

  return NextResponse.json({ sent, feedback })
}
