'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'

function ImportContent() {
  const params = useSearchParams()
  const [status, setStatus] = useState<'saving' | 'done' | 'empty'>('saving')
  const [count, setCount] = useState(0)

  useEffect(() => {
    const data: Record<string, number> = {}
    const keys = ['hrv', 'steps', 'calories', 'heart_rate', 'sleep_hours', 'workout_minutes']
    keys.forEach(k => {
      const v = params.get(k)
      if (v && !isNaN(+v)) data[k] = +v
    })

    if (Object.keys(data).length === 0) { setStatus('empty'); return }

    setCount(Object.keys(data).length)

    const supabase = createClient()
    supabase.from('health_data').upsert({
      id: 'levi_health_today',
      data,
      updated_at: new Date().toISOString(),
    }).then(() => setStatus('done'))
  }, [params])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center space-y-5 max-w-xs">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-4xl">
          {status === 'saving' ? '⌚' : status === 'done' ? '✓' : '⚠️'}
        </div>

        {status === 'saving' && <p className="text-lg font-medium text-foreground">Wird gespeichert...</p>}

        {status === 'done' && (
          <>
            <p className="text-lg font-bold text-emerald-400">✓ {count} Werte gespeichert</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apple Watch Daten wurden übertragen.
            </p>
            <div className="bg-card border border-border rounded-2xl p-4 text-left space-y-2">
              <p className="text-xs font-medium text-foreground">Jetzt die App öffnen:</p>
              <p className="text-xs text-muted-foreground">Tippe auf das <strong>Levi Health</strong> Icon auf deinem Homescreen — dort sind alle deine Daten gespeichert.</p>
            </div>
          </>
        )}

        {status === 'empty' && (
          <p className="text-sm text-muted-foreground">Keine Daten empfangen — prüfe den Shortcut.</p>
        )}
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    }>
      <ImportContent />
    </Suspense>
  )
}
