'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Dumbbell, Heart, Footprints, Plus, Clock, Trash2, TrendingUp } from 'lucide-react'

type Workout = { id: number; type: string; name: string; duration: number; avgHR: number; date: string }

const WORKOUT_TYPES = [
  { key: 'strength', label: 'Kraft',     emoji: '🏋️' },
  { key: 'cardio',   label: 'Ausdauer',  emoji: '🏃' },
  { key: 'mobility', label: 'Mobilität', emoji: '🧘' },
  { key: 'hiit',     label: 'HIIT',      emoji: '⚡' },
]

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

export default function FitnessPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [newW, setNewW]         = useState({ type: 'strength', name: '', duration: '', avgHR: '' })
  const [adding, setAdding]     = useState(false)
  const [healthData, setHealthData] = useState<Record<string, number | null>>({})

  useEffect(() => {
    setWorkouts(load<Workout[]>('levi_workouts', []))
    setHealthData(load('levi_health_today', {}))
  }, [])

  const saveWorkouts = (updated: Workout[]) => {
    setWorkouts(updated)
    localStorage.setItem('levi_workouts', JSON.stringify(updated))
  }

  const addWorkout = () => {
    if (!newW.name) return
    const updated = [{
      id: Date.now(), type: newW.type, name: newW.name,
      duration: +newW.duration || 0, avgHR: +newW.avgHR || 0,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    }, ...workouts]
    saveWorkouts(updated)
    setNewW({ type: 'strength', name: '', duration: '', avgHR: '' })
    setAdding(false)
  }

  const stepsData = workouts
    .slice(0, 7)
    .map(w => ({ date: w.date, min: w.duration }))
    .reverse()

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold">Fitness</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(p => !p)}
          className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
          <Plus className="w-3 h-3 mr-1" />Workout
        </Button>
      </div>

      {/* Watch-Daten aus Shortcut */}
      {(healthData.steps || healthData.heart_rate) && (
        <div className="grid grid-cols-2 gap-3">
          {healthData.steps && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Footprints className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-400">{healthData.steps?.toLocaleString('de-DE')}</p>
                <p className="text-xs text-muted-foreground">Schritte heute</p>
              </CardContent>
            </Card>
          )}
          {healthData.heart_rate && (
            <Card className="bg-card border-border">
              <CardContent className="p-4 text-center">
                <Heart className="w-5 h-5 text-red-400 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-400">{healthData.heart_rate}</p>
                <p className="text-xs text-muted-foreground">Herzfrequenz (bpm)</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Training Verlauf */}
      {stepsData.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-sm">Trainingsminuten (letzte Workouts)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={stepsData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="min" fill="#10b981" radius={[4,4,0,0]} name="Minuten" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Add workout form */}
      {adding && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2 flex-wrap">
              {WORKOUT_TYPES.map(t => (
                <button key={t.key} onClick={() => setNewW(p => ({...p, type: t.key}))}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${newW.type === t.key ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground'}`}>
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
            <Input placeholder="Name des Workouts" value={newW.name}
              onChange={e => setNewW(p => ({...p, name: e.target.value}))}
              className="bg-secondary border-border" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Dauer (min)" value={newW.duration}
                onChange={e => setNewW(p => ({...p, duration: e.target.value}))}
                className="bg-secondary border-border" />
              <Input type="number" placeholder="Ø Puls (bpm)" value={newW.avgHR}
                onChange={e => setNewW(p => ({...p, avgHR: e.target.value}))}
                className="bg-secondary border-border" />
            </div>
            <Button onClick={addWorkout} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Speichern
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Workout history */}
      {workouts.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Letzte Workouts</h2>
          {workouts.map(w => {
            const type = WORKOUT_TYPES.find(t => t.key === w.type)
            return (
              <Card key={w.id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{type?.emoji}</span>
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.date} · <Clock className="w-3 h-3 inline" /> {w.duration}min
                        {w.avgHR > 0 && ` · ♥ ${w.avgHR}bpm`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-secondary text-muted-foreground border-0 text-xs">{type?.label}</Badge>
                    <button onClick={() => saveWorkouts(workouts.filter(x => x.id !== w.id))}
                      className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Noch keine Workouts — tippe auf + Workout um deins einzutragen
        </div>
      )}
    </div>
  )
}
