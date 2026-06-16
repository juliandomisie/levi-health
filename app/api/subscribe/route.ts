import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json()
    const supabase = createClient()
    await supabase.from('push_subscriptions').upsert({
      endpoint: subscription.endpoint,
      subscription,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
