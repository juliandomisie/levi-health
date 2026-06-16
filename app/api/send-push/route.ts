import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  'mailto:admin@levi-health.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const MESSAGES = {
  morning: {
    title: '🌅 Guten Morgen, Julian!',
    body: 'Nicht vergessen: Wiege dich jetzt — am besten nüchtern für genaue Werte. Wie war deine Nacht?',
  },
  noon: {
    title: '☀️ Mittags-Check — 14:00 Uhr',
    body: 'Gegessen? Wasser getrunken? Schritte gemacht? Kurz in Levi eintragen und Werte messen — dein Körper dankt es dir! 💪',
  },
  evening: {
    title: '🌙 Abend-Routine, Julian',
    body: 'Zeit für deine Supplemente! Magnesium, Omega-3, Vitamin D nicht vergessen. Dimm das Licht, leg das Handy weg — dein Schlaf beginnt jetzt.',
  },
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-push-secret')
  if (secret !== process.env.PUSH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type } = await req.json()
  const msg = MESSAGES[type as keyof typeof MESSAGES]
  if (!msg) return NextResponse.json({ error: 'Unknown type' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )

  const { data: subs } = await supabase.from('push_subscriptions').select('subscription')
  let sent = 0, failed = 0

  for (const row of subs ?? []) {
    try {
      await webpush.sendNotification(row.subscription, JSON.stringify(msg))
      sent++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ sent, failed })
}
