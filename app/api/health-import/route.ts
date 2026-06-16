import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const {
      hrv,
      steps,
      calories,
      sleep_hours,
      heart_rate,
      date = new Date().toISOString().split('T')[0],
    } = data

    // Store in Supabase if available, otherwise just acknowledge
    // TODO: connect to authenticated user session
    console.log('Health import received:', { hrv, steps, calories, sleep_hours, heart_rate, date })

    return NextResponse.json({
      success: true,
      message: 'Gesundheitsdaten empfangen',
      received: { hrv, steps, calories, sleep_hours, heart_rate, date },
    })
  } catch (error) {
    console.error('Health import error:', error)
    return NextResponse.json({ success: false, message: 'Fehler beim Import' }, { status: 400 })
  }
}
