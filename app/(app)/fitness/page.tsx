'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts'
import { Dumbbell, Heart, Footprints, Zap, Plus, Clock } from 'lucide-react'
import { mockFitnessData } from '@/lib/mock-data'

const WORKOUT_TYPES = [
  { key: 'strength', label: 'Kraft',     emoji: '🏋️', color: 'text-blue-400' },
  { key: 'cardio',   label: 'Ausdauer',  emoji: '🏃', color: 'text-red-400' },
  { key: 'mobility', label: 'Mobilität', emoji: '🧘', color: 'text-purple-400' },
  { key: 'hiit',     label: 'HIIT',      emoji: '⚡', color: 'text-yellow-400' },
]

const HR_ZONES = [
  { zone: 'Zone 1', name: 'Erholung',    range: '93–111', color: '#6b7280' },
  { zone: 'Zone 2', name: 'Aerob',       range: '111–130', color: '#3b82f6' },
  { zone: 'Zone 3', name: 'Aerob hoch',  range: '130–148', color: '#10b981' },
  { zone: 'Zone 4', name: 'Anaerob',     range: '148–167', color: '#f59e0b' },
  { zone: 'Zone 5', name: 'Max',         range: '167–185', color: '#ef4444' },
]

export default function FitnessPage() {
  const [workouts, setWorkouts] = useState([
    { type: 'strength', name: 'Upper Body Push', duration: 52, avgHR: 128, date: 'Heute' },
    { type: 'cardio',   name: '5km Lauf',         duration: 27, avgHR: 155, date: 'Gestern' },
  ])
  const [newW, setNewW] = useState({ type: 'strength', name: '', duration: '', avgHR: '' })
  const [adding, setAdding] = useState(false)

  const recoveryScore = 82
  const vo2max = 51.3

  const addWorkout = () => {
    if (!newW.name) return
    setWorkouts(p => [{ ...newW, duration: +newW.duration || 0, avgHR: +newW.avgHR || 0, date: 'Heute' }, ...p])
    setNewW({ type: 'strength', name: '', duration: '', avgHR: '' })
    setAdding(false)
  }

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

      {/* Recovery + VO2max */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-3xl font-bold text-emerald-400">{recoveryScore}</p>
            <p className="text-xs text-muted-foreground">Recovery Score</p>
            <Badge className="mt-1 bg-emerald-500/20 text-emerald-400 text-xs border-0">Bereit</Badge>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Heart className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-3xl font-bold text-blue-400">{vo2max}</p>
            <p className="text-xs text-muted-foreground">VO₂max (ml/kg/min)</p>
            <Badge className="mt-1 bg-blue-500/20 text-blue-400 text-xs border-0">Überdurchschnittlich</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Steps chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-emerald-400" />
            <CardTitle className="text-sm">Schritte (7 Tage)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={mockFitnessData}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="steps" fill="#10b981" radius={[4,4,0,0]} name="Schritte" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* HR Zones */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <CardTitle className="text-sm">Herzfrequenz-Zonen</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {HR_ZONES.map((z) => (
            <div key={z.zone} className="flex items-center gap-3">
              <div className="w-16 text-xs text-muted-foreground">{z.zone}</div>
              <div className="flex-1 h-1.5 bg-secondary rounded-full">
                <div className="h-full rounded-full" style={{ width: '60%', background: z.color }} />
              </div>
              <div className="text-xs text-right" style={{ color: z.color }}>{z.range} bpm</div>
            </div>
          ))}
        </CardContent>
      </Card>

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
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Letzte Workouts</h2>
        {workouts.map((w, i) => {
          const type = WORKOUT_TYPES.find(t => t.key === w.type)
          return (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{type?.emoji}</span>
                  <div>
                    <p className="text-sm font-medium">{w.name}</p>
                    <p className="text-xs text-muted-foreground">{w.date} · <Clock className="w-3 h-3 inline" /> {w.duration}min · ♥ {w.avgHR}bpm</p>
                  </div>
                </div>
                <Badge className="bg-secondary text-muted-foreground border-0 text-xs">{type?.label}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
