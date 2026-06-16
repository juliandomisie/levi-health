'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function ImportContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState('Daten werden gespeichert...')

  useEffect(() => {
    const data: Record<string, number> = {}
    const keys = ['hrv', 'steps', 'calories', 'heart_rate', 'sleep_hours', 'sleep', 'workout_minutes']
    keys.forEach(k => {
      const v = params.get(k)
      if (v && !isNaN(+v)) data[k] = +v
    })

    if (Object.keys(data).length > 0) {
      const today = new Date().toDateString()
      localStorage.setItem('levi_health_today', JSON.stringify(data))
      localStorage.setItem('levi_health_date', JSON.stringify(today))
      setStatus(`✓ ${Object.keys(data).length} Werte von Apple Watch gespeichert`)
    } else {
      setStatus('Keine Daten empfangen')
    }

    setTimeout(() => router.push('/dashboard'), 2000)
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <span className="text-2xl">⌚</span>
        </div>
        <p className="text-lg font-medium">{status}</p>
        <p className="text-sm text-muted-foreground">Weiterleitung zum Dashboard...</p>
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Laden...</p></div>}>
      <ImportContent />
    </Suspense>
  )
}
