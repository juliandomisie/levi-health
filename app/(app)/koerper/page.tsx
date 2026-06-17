'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Scale, Zap, TrendingDown, TrendingUp, Minus, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type WeightEntry = { date: string; weight: number; dateKey: string }

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

function round2(n: number) { return Math.round(n * 100) / 100 }

function calcBattery(health: Record<string, number>, sleepEntries: { hours: number; hrv: number }[]) {
  const sleep = health.sleep_hours ?? sleepEntries[0]?.hours ?? 0
  const hrv   = health.hrv ?? sleepEntries[0]?.hrv ?? 0
  const workout = health.workout_minutes ?? 0

  const sleepScore   = Math.min(sleep / 8 * 40, 40)
  const hrvScore     = Math.min(hrv / 70 * 35, 35)
  const base         = 10
  const workoutBonus = workout > 0 ? Math.min(workout / 60 * 10, 10) : 0
  const overtraining = workout > 90 ? Math.min((workout - 90) / 60 * 6, 8) : 0

  return Math.max(5, Math.min(100, Math.round(base + sleepScore + hrvScore + workoutBonus - overtraining)))
}

function batteryColor(pct: number) {
  if (pct >= 75) return 'text-emerald-400'
  if (pct >= 45) return 'text-yellow-400'
  return 'text-red-400'
}

function batteryLabel(pct: number) {
  if (pct >= 80) return 'Ausgezeichnet — volle Energie!'
  if (pct >= 60) return 'Gut erholt — bereit für den Tag'
  if (pct >= 40) return 'Mittelmäßig — moderate Belastung empfohlen'
  if (pct >= 20) return 'Niedrig — Erholung priorisieren'
  return 'Erschöpft — Ruhe ist heute Priorität'
}

export default function KoerperPage() {
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [saved, setSaved] = useState(false)
  const [battery, setBattery] = useState(0)
  const [healthData, setHealthData] = useState<Record<string, number>>({})

  useEffect(() => {
    const local = load<WeightEntry[]>('levi_weight_log', [])
    setWeightLog(local)

    const health = load<Record<string, number>>('levi_health_today', {})
    const sleepEntries = load<{ hours: number; hrv: number }[]>('levi_sleep_entries', [])
    setHealthData(health)
    setBattery(calcBattery(health, sleepEntries))

    // Load weight from Supabase
    const supabase = createClient()
    supabase.from('health_data').select('data').eq('id', 'levi_weight_log').single()
      .then(({ data: row }) => {
        const entries = (row as { data?: { entries?: WeightEntry[] } } | null)?.data?.entries
        if (entries && entries.length > 0) {
          setWeightLog(entries)
          localStorage.setItem('levi_weight_log', JSON.stringify(entries))
        }
      })
  }, [])

  const saveWeight = async () => {
    if (!weightInput) return
    const dateKey = new Date().toDateString()
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    const entry: WeightEntry = { date, weight: +weightInput, dateKey }
    const updated = [entry, ...weightLog.filter(e => e.dateKey !== dateKey)].slice(0, 90)
    setWeightLog(updated)
    localStorage.setItem('levi_weight_log', JSON.stringify(updated))
    setWeightInput('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // Save to Supabase
    const supabase = createClient()
    await supabase.from('health_data').upsert({
      id: 'levi_weight_log',
      data: { entries: updated },
      updated_at: new Date().toISOString(),
    })
  }

  const deleteWeight = async (idx: number) => {
    const updated = weightLog.filter((_, i) => i !== idx)
    setWeightLog(updated)
    localStorage.setItem('levi_weight_log', JSON.stringify(updated))
    const supabase = createClient()
    await supabase.from('health_data').upsert({
      id: 'levi_weight_log',
      data: { entries: updated },
      updated_at: new Date().toISOString(),
    })
  }

  const chartData = [...weightLog].reverse().slice(-30)
  const latest = weightLog[0]?.weight
  const prev   = weightLog[1]?.weight
  const diff   = latest && prev ? round2(latest - prev) : null
  const minW   = weightLog.length > 0 ? Math.min(...weightLog.slice(0, 30).map(e => e.weight)) : 0
  const maxW   = weightLog.length > 0 ? Math.max(...weightLog.slice(0, 30).map(e => e.weight)) : 0

  const bColor = batteryColor(battery)

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-emerald-400" />
        <h1 className="text-xl font-bold">Körper</h1>
      </div>

      {/* Körperbatterie */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />Körperbatterie heute
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`text-6xl font-bold ${bColor}`}>{battery}%</div>
            <div className="flex-1">
              <p className="text-sm font-medium">{batteryLabel(battery)}</p>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Schlaf</span>
                  <span>{round2(healthData.sleep_hours ?? load<{hours:number}[]>('levi_sleep_entries',[])[0]?.hours ?? 0)}h</span>
                </div>
                <div className="flex justify-between">
                  <span>HRV</span>
                  <span>{round2(healthData.hrv ?? load<{hrv:number}[]>('levi_sleep_entries',[])[0]?.hrv ?? 0)} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Training</span>
                  <span>{healthData.workout_minutes ?? 0} min</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full bg-secondary rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${battery >= 75 ? 'bg-emerald-400' : battery >= 45 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${battery}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Basiert auf Schlaf · HRV · Trainingsintensität — Watch-Shortcut für genaue Werte ausführen
          </p>
        </CardContent>
      </Card>

      {/* Gewicht eintragen */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-400" />Gewicht
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input type="number" step="0.1" value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="kg eingeben..."
              className="bg-secondary border-border"
              onKeyDown={e => e.key === 'Enter' && saveWeight()} />
            <Button onClick={saveWeight} className="bg-blue-600 hover:bg-blue-700 text-white px-5 shrink-0">
              {saved ? '✓' : 'Speichern'}
            </Button>
          </div>

          {weightLog.length > 0 && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-secondary rounded-xl p-3">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {diff === null ? <Minus className="w-3 h-3 text-muted-foreground" /> :
                      diff < 0 ? <TrendingDown className="w-3 h-3 text-emerald-400" /> :
                      diff > 0 ? <TrendingUp className="w-3 h-3 text-orange-400" /> :
                      <Minus className="w-3 h-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xl font-bold text-blue-400">{latest} kg</p>
                  <p className="text-[10px] text-muted-foreground">Heute</p>
                  {diff !== null && (
                    <p className={`text-xs font-medium ${diff < 0 ? 'text-emerald-400' : diff > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                      {diff > 0 ? '+' : ''}{diff} kg
                    </p>
                  )}
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xl font-bold text-emerald-400">{minW} kg</p>
                  <p className="text-[10px] text-muted-foreground">Tiefst (30T)</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xl font-bold text-orange-400">{maxW} kg</p>
                  <p className="text-[10px] text-muted-foreground">Höchst (30T)</p>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} hide />
                    {latest && <ReferenceLine y={latest} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.4} />}
                    <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown) => [`${v} kg`, 'Gewicht']} />
                    <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2.5}
                      dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {/* History */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {weightLog.slice(0, 14).map((e, i) => (
                  <div key={i} className="flex justify-between items-center bg-secondary rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{e.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-blue-400">{e.weight} kg</span>
                      <button onClick={() => deleteWeight(i)} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {weightLog.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">
              Noch kein Gewicht eingetragen — am besten morgens nüchtern wiegen
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
