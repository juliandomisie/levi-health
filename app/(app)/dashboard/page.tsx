'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Moon, Zap, Dumbbell, Droplets, Heart, Brain } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

function ScoreCard({ icon: Icon, label, value, unit, color, empty }: {
  icon: React.ElementType; label: string; value: string | number; unit?: string; color: string; empty?: boolean
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        {empty ? (
          <p className="text-xs text-muted-foreground">—</p>
        ) : (
          <div className="flex items-end gap-1">
            <span className={`text-3xl font-bold ${color}`}>{value}</span>
            {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [name, setName] = useState('Julian')
  const [water, setWater] = useState(0)
  const [meals, setMeals] = useState<Array<{ calories: number }>>([])
  const [healthData, setHealthData] = useState<Record<string, number | null>>({})
  const [hour, setHour] = useState(0)

  const readLocal = () => {
    setName(load('levi_name', 'Julian') || 'Julian')
    setWater(load('levi_water_today', 0))
    setMeals(load('levi_meals_today', []))
    setHour(new Date().getHours())
    const localHealth = load<Record<string, number>>('levi_health_today', {})
    // Fall back to manual sleep entry if no shortcut data
    const sleepEntries = load<{ hours: number }[]>('levi_sleep_entries', [])
    const manualSleep = sleepEntries[0]?.hours ?? null
    const merged = {
      ...localHealth,
      sleep_hours: localHealth.sleep_hours || manualSleep,
    }
    if (Object.keys(merged).length > 0) setHealthData(merged)
  }

  const readFromSupabase = async () => {
    try {
      const supabase = createClient()
      const { data: row } = await supabase
        .from('health_data')
        .select('data')
        .eq('id', 'levi_health_today')
        .single()
      if (row?.data && Object.keys(row.data).length > 0) {
        setHealthData(row.data)
        localStorage.setItem('levi_health_today', JSON.stringify(row.data))
      }
    } catch {
      // Supabase not available, use localStorage
    }
  }

  useEffect(() => {
    readLocal()
    readFromSupabase()

    const onVisible = () => {
      if (!document.hidden) {
        readLocal()
        readFromSupabase()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', readLocal)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', readLocal)
    }
  }, []) // eslint-disable-line

  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend'
  const totalCalories = meals.reduce((s, m) => s + m.calories, 0)
  const hasAnyData = water > 0 || meals.length > 0 || Object.keys(healthData).length > 0

  return (
    <div className="space-y-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold">{greeting}, {name} 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <Card className="bg-gradient-to-br from-emerald-950/60 to-teal-950/40 border-emerald-800/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-medium mb-1">Levi</p>
              {hasAnyData ? (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {water > 0 && `Du hast heute ${water}ml Wasser getrunken. `}
                  {totalCalories > 0 && `Kalorien: ${totalCalories} kcal. `}
                  {healthData.hrv && `HRV: ${Math.round(healthData.hrv * 100) / 100}ms. `}
                  Weiter so!
                </p>
              ) : (
                <p className="text-sm text-foreground/90 leading-relaxed">
                  Hallo {name}! Starte deinen Tag — trag deine ersten Daten ein oder lass den Apple Watch Shortcut laufen.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <ScoreCard icon={Moon}     label="Schlaf"       value={healthData.sleep_hours ?? '—'} unit={healthData.sleep_hours ? 'h' : ''} color="text-indigo-400" empty={!healthData.sleep_hours} />
        <ScoreCard icon={Heart}    label="HRV"          value={healthData.hrv ? Math.round(healthData.hrv * 100) / 100 : '—'} unit={healthData.hrv ? 'ms' : ''} color="text-rose-400" empty={!healthData.hrv} />
        <ScoreCard icon={Zap}      label="Schritte"     value={healthData.steps ?? '—'} color="text-yellow-400" empty={!healthData.steps} />
        <ScoreCard icon={Dumbbell} label="Kalorien"     value={totalCalories || '—'} unit={totalCalories ? 'kcal' : ''} color="text-orange-400" empty={!totalCalories} />
        <ScoreCard icon={Droplets} label="Wasser"       value={water || '—'} unit={water ? 'ml' : ''} color="text-cyan-400" empty={!water} />
        <ScoreCard icon={Heart}    label="Herzfrequenz" value={healthData.heart_rate ?? '—'} unit={healthData.heart_rate ? 'bpm' : ''} color="text-red-400" empty={!healthData.heart_rate} />
      </div>

      {!hasAnyData && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Noch keine Daten für heute</p>
            <p className="text-xs text-muted-foreground mt-1">Apple Watch Shortcut ausführen oder Daten manuell eintragen</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
