'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Moon, Heart, Save, TrendingUp, Trash2, Sparkles, Loader2 } from 'lucide-react'

type Entry = { date: string; bedtime: string; waketime: string; hours: number; hrv: number; quality: number; aiScore?: number; aiComment?: string }

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

export default function SleepPage() {
  const [bedtime, setBedtime]   = useState('')
  const [waketime, setWaketime] = useState('')
  const [hrv, setHrv]           = useState('')
  const [quality, setQuality]   = useState<number[]>([7])
  const [saved, setSaved]         = useState(false)
  const [entries, setEntries]     = useState<Entry[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    setEntries(load<Entry[]>('levi_sleep_entries', []))
  }, [])

  const calcHours = (b: string, w: string) => {
    if (!b || !w) return 0
    const [bh, bm] = b.split(':').map(Number)
    const [wh, wm] = w.split(':').map(Number)
    let diff = (wh * 60 + wm) - (bh * 60 + bm)
    if (diff < 0) diff += 1440
    return +(diff / 60).toFixed(1)
  }

  const hours = calcHours(bedtime, waketime)

  const handleSave = async () => {
    if (!bedtime || !waketime) return
    const h = calcHours(bedtime, waketime)
    const entry: Entry = {
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      bedtime, waketime,
      hours: h,
      hrv: +hrv || 0,
      quality: quality[0],
    }
    const updated = [entry, ...entries].slice(0, 30)
    setEntries(updated)
    localStorage.setItem('levi_sleep_entries', JSON.stringify(updated))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    // AI analysis
    if (h > 0) {
      setAnalyzing(true)
      try {
        const res = await fetch('/api/analyze-sleep', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hours: h, hrv: +hrv || 0, quality: quality[0] }),
        })
        const { score, comment } = await res.json()
        const withAI = [{ ...entry, aiScore: score, aiComment: comment }, ...entries].slice(0, 30)
        setEntries(withAI)
        localStorage.setItem('levi_sleep_entries', JSON.stringify(withAI))
      } catch { /* skip silently */ }
      setAnalyzing(false)
    }
  }

  const deleteEntry = (i: number) => {
    const updated = entries.filter((_, idx) => idx !== i)
    setEntries(updated)
    localStorage.setItem('levi_sleep_entries', JSON.stringify(updated))
  }

  const chartData = [...entries].reverse().slice(-14)
  const hrvData   = entries.filter(e => e.hrv > 0).reverse().slice(-30)

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Moon className="w-5 h-5 text-blue-400" />
        <h1 className="text-xl font-bold">Schlaf</h1>
      </div>

      {/* Log Entry */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Heute eintragen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Einschlafen + Aufwachen – stacked to avoid overlap */}
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Einschlafen</Label>
              <Input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Aufwachen</Label>
              <Input type="time" value={waketime} onChange={e => setWaketime(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground" />
            </div>
          </div>

          {hours > 0 && (
            <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground">Schlafdauer</span>
              <span className="text-2xl font-bold text-blue-400">{hours}h</span>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">HRV morgens (ms)</Label>
            <Input type="number" value={hrv} onChange={e => setHrv(e.target.value)}
              placeholder="z.B. 65" className="mt-1 bg-secondary border-border text-foreground" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Schlafqualität</Label>
              <span className="text-sm font-bold text-blue-400">{quality[0]}/10</span>
            </div>
            <Slider value={quality} onValueChange={(v) => setQuality(v as number[])} min={1} max={10} step={1}
              className="[&_[role=slider]]:bg-blue-400" />
          </div>

          <Button onClick={handleSave} disabled={analyzing} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {analyzing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Levi analysiert...</> :
              saved ? '✓ Gespeichert!' : <><Save className="w-4 h-4 mr-2" />Eintragen & analysieren</>}
          </Button>
        </CardContent>
      </Card>

      {/* HRV Chart – nur wenn Daten vorhanden */}
      {hrvData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <CardTitle className="text-sm">HRV Verlauf</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={hrvData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="hrv" stroke="#ef4444" strokeWidth={2} dot={false} name="HRV (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sleep Chart – nur wenn Daten vorhanden */}
      {chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <CardTitle className="text-sm">Schlaf Verlauf</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} hide />
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="url(#sg)" strokeWidth={2} dot={false} name="Stunden" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {entries.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Einträge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.slice(0, 7).map((e, i) => (
              <div key={i} className="bg-secondary rounded-xl px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{e.date}</span>
                    <span className="text-xs text-muted-foreground ml-2">{e.bedtime} → {e.waketime}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-blue-400">{e.hours}h</span>
                    {e.hrv > 0 && <span className="text-xs text-muted-foreground">HRV {Math.round(e.hrv * 100) / 100}</span>}
                    {e.aiScore !== undefined && (
                      <span className={`text-xs font-bold ${e.aiScore >= 8 ? 'text-emerald-400' : e.aiScore >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                        <Sparkles className="w-3 h-3 inline mr-0.5" />{e.aiScore}/10
                      </span>
                    )}
                    <button onClick={() => deleteEntry(i)} className="text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {e.aiComment && (
                  <p className="text-xs text-muted-foreground italic pl-1">{e.aiComment}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Einträge — trag deinen ersten Schlaf ein
        </div>
      )}
    </div>
  )
}
