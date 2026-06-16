'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Utensils, Droplets, Timer, Plus, Flame } from 'lucide-react'

const MACRO_GOALS = { protein: 160, carbs: 220, fat: 70, calories: 2200 }

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Frühstück', emoji: '🌅' },
  { key: 'lunch',     label: 'Mittagessen', emoji: '☀️' },
  { key: 'dinner',    label: 'Abendessen', emoji: '🌙' },
  { key: 'snack',     label: 'Snack', emoji: '🍎' },
]

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min((value / goal) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={color}>{value}g / {goal}g</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color.replace('text-','bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function NutritionPage() {
  const [water, setWater] = useState(1200)
  const [fastStart, setFastStart] = useState<Date | null>(null)
  const [fastElapsed, setFastElapsed] = useState('00:00:00')
  const [meals, setMeals] = useState([
    { type: 'breakfast', name: 'Haferflocken mit Beeren', protein: 12, carbs: 58, fat: 6, calories: 340 },
    { type: 'lunch',     name: 'Hühnchen & Reis',        protein: 48, carbs: 62, fat: 10, calories: 530 },
  ])
  const [newMeal, setNewMeal] = useState({ name: '', protein: '', carbs: '', fat: '', calories: '', type: 'snack' })
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (fastStart) {
      intervalRef.current = setInterval(() => {
        const diff = Date.now() - fastStart.getTime()
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0')
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0')
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0')
        setFastElapsed(`${h}:${m}:${s}`)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fastStart])

  const totals = meals.reduce((acc, m) => ({
    protein: acc.protein + m.protein,
    carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat,
    calories: acc.calories + m.calories,
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 })

  const addMeal = () => {
    if (!newMeal.name) return
    setMeals(prev => [...prev, {
      type: newMeal.type,
      name: newMeal.name,
      protein: +newMeal.protein || 0,
      carbs: +newMeal.carbs || 0,
      fat: +newMeal.fat || 0,
      calories: +newMeal.calories || 0,
    }])
    setNewMeal({ name: '', protein: '', carbs: '', fat: '', calories: '', type: 'snack' })
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Utensils className="w-5 h-5 text-orange-400" />
        <h1 className="text-xl font-bold">Ernährung</h1>
      </div>

      {/* Macro Progress */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-semibold">Heute</span>
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-lg font-bold text-orange-400">{totals.calories}</span>
              <span className="text-xs text-muted-foreground">/ {MACRO_GOALS.calories} kcal</span>
            </div>
          </div>
          <MacroBar label="Protein" value={totals.protein} goal={MACRO_GOALS.protein} color="text-blue-400" />
          <MacroBar label="Kohlenhydrate" value={totals.carbs}   goal={MACRO_GOALS.carbs}   color="text-yellow-400" />
          <MacroBar label="Fett"           value={totals.fat}     goal={MACRO_GOALS.fat}     color="text-purple-400" />
        </CardContent>
      </Card>

      {/* Water */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold">Wasser</span>
            </div>
            <span className="text-lg font-bold text-cyan-400">{water}ml <span className="text-sm text-muted-foreground">/ 2500ml</span></span>
          </div>
          <Progress value={(water / 2500) * 100} className="mb-3 [&>div]:bg-cyan-400" />
          <div className="flex gap-2">
            {[150, 250, 500].map(ml => (
              <Button key={ml} variant="outline" size="sm" onClick={() => setWater(w => w + ml)}
                className="flex-1 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 text-xs">
                +{ml}ml
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fasting Timer */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Timer className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold">Fasten-Timer (16:8)</span>
          </div>
          {fastStart ? (
            <div className="text-center py-2">
              <p className="text-3xl font-mono font-bold text-emerald-400">{fastElapsed}</p>
              <p className="text-xs text-muted-foreground mt-1">Fasten läuft · Ziel: 16:00:00</p>
              <Button onClick={() => setFastStart(null)} variant="outline" size="sm"
                className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10">
                Fasten beenden
              </Button>
            </div>
          ) : (
            <Button onClick={() => setFastStart(new Date())} className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30">
              Fasten starten
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Meal Log */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mahlzeiten heute</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {meals.map((meal, i) => {
            const mt = MEAL_TYPES.find(t => t.key === meal.type)
            return (
              <div key={i} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{mt?.emoji}</span>
                    <span className="text-sm font-medium">{meal.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    P {meal.protein}g · K {meal.carbs}g · F {meal.fat}g
                  </span>
                </div>
                <span className="text-sm font-bold text-orange-400">{meal.calories} kcal</span>
              </div>
            )
          })}

          {/* Add meal */}
          <div className="border border-dashed border-border rounded-xl p-3 space-y-2">
            <Input value={newMeal.name} onChange={e => setNewMeal(p => ({...p, name: e.target.value}))}
              placeholder="Mahlzeit beschreiben..." className="bg-background border-border text-sm" />
            <div className="grid grid-cols-4 gap-2">
              {(['protein','carbs','fat','calories'] as const).map(k => (
                <Input key={k} type="number" value={newMeal[k]}
                  onChange={e => setNewMeal(p => ({...p, [k]: e.target.value}))}
                  placeholder={k === 'calories' ? 'kcal' : k[0].toUpperCase()}
                  className="bg-background border-border text-xs" />
              ))}
            </div>
            <Button onClick={addMeal} size="sm" className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
              <Plus className="w-3 h-3 mr-1" />Hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
