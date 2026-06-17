'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Utensils, Droplets, Timer, Plus, Flame, Camera, X, Trash2, QrCode, Loader2, Target } from 'lucide-react'
import jsQR from 'jsqr'

type Meal = { id: number; type: string; name: string; protein: number; carbs: number; fat: number; calories: number }

const FITNESS_GOALS: Record<string, { label: string; emoji: string; color: string }> = {
  aufbau:  { label: 'Muskelaufbau',    emoji: '💪', color: 'text-blue-400' },
  halten:  { label: 'Gewicht halten',  emoji: '⚖️', color: 'text-yellow-400' },
  defizit: { label: 'Kaloriendefizit', emoji: '🔥', color: 'text-orange-400' },
}

const MACRO_TARGETS: Record<string, { protein: number; carbs: number; fat: number }> = {
  aufbau:  { protein: 35, carbs: 45, fat: 20 },
  halten:  { protein: 30, carbs: 40, fat: 30 },
  defizit: { protein: 40, carbs: 35, fat: 25 },
}

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Frühstück', emoji: '🌅' },
  { key: 'lunch',     label: 'Mittagessen', emoji: '☀️' },
  { key: 'dinner',    label: 'Abendessen', emoji: '🌙' },
  { key: 'snack',     label: 'Snack', emoji: '🍎' },
]

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

function MacroBar({ label, value, pct, target, color }: { label: string; value: number; pct: number; target: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={color + ' font-medium'}>{value}g <span className="text-muted-foreground">({pct}%)</span></span>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color.replace('text-', 'bg-')}`}
          style={{ width: `${Math.min((pct / target) * 100, 100)}%` }} />
      </div>
      <p className="text-[9px] text-muted-foreground text-right">Ziel: {target}%</p>
    </div>
  )
}

export default function NutritionPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [water, setWater] = useState(0)
  const [fastStart, setFastStart] = useState<Date | null>(null)
  const [fastElapsed, setFastElapsed] = useState('00:00:00')
  const [showAdd, setShowAdd] = useState(false)
  const [newMeal, setNewMeal] = useState({ name: '', protein: '', carbs: '', fat: '', calories: '', type: 'snack' })
  const [calorieGoal, setCalorieGoal] = useState(0)
  const [fitnessGoal, setFitnessGoal] = useState('halten')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<'photo' | 'qr'>('photo')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const qrRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const todayKey = new Date().toDateString()
    const lastDay = load<string>('levi_last_day', '')
    if (lastDay !== todayKey) {
      localStorage.setItem('levi_last_day', JSON.stringify(todayKey))
      localStorage.setItem('levi_meals_today', JSON.stringify([]))
      localStorage.setItem('levi_water_today', JSON.stringify(0))
    }
    setMeals(load<Meal[]>('levi_meals_today', []))
    setWater(load<number>('levi_water_today', 0))
    setCalorieGoal(load<number>('levi_calorie_goal', 0))
    setFitnessGoal(load<string>('levi_fitness_goal', 'halten'))
    const savedFast = load<string | null>('levi_fast_start', null)
    if (savedFast) setFastStart(new Date(savedFast))
  }, [])

  useEffect(() => {
    if (fastStart) {
      timerRef.current = setInterval(() => {
        const d = Date.now() - fastStart.getTime()
        const h = Math.floor(d / 3600000).toString().padStart(2, '0')
        const m = Math.floor((d % 3600000) / 60000).toString().padStart(2, '0')
        const s = Math.floor((d % 60000) / 1000).toString().padStart(2, '0')
        setFastElapsed(`${h}:${m}:${s}`)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [fastStart])

  const saveMeals = (updated: Meal[]) => {
    setMeals(updated)
    localStorage.setItem('levi_meals_today', JSON.stringify(updated))
  }

  const saveWater = (val: number) => {
    const clamped = Math.max(0, val)
    setWater(clamped)
    localStorage.setItem('levi_water_today', JSON.stringify(clamped))
  }

  const totals = meals.reduce((acc, m) => ({
    protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat, calories: acc.calories + m.calories,
  }), { protein: 0, carbs: 0, fat: 0, calories: 0 })

  const addMeal = () => {
    if (!newMeal.name) return
    saveMeals([...meals, {
      id: Date.now(), type: newMeal.type, name: newMeal.name,
      protein: +newMeal.protein || 0, carbs: +newMeal.carbs || 0,
      fat: +newMeal.fat || 0, calories: +newMeal.calories || 0,
    }])
    setNewMeal({ name: '', protein: '', carbs: '', fat: '', calories: '', type: 'snack' })
    setAnalysisResult('')
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (qrRef.current) clearInterval(qrRef.current)
    setShowCamera(false)
  }, [])

  const startCamera = async (mode: 'photo' | 'qr') => {
    setCameraMode(mode)
    setAnalysisResult('')
    setShowCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      if (mode === 'qr') {
        qrRef.current = setInterval(() => {
          if (!videoRef.current || !canvasRef.current) return
          const ctx = canvasRef.current.getContext('2d')
          if (!ctx || videoRef.current.videoWidth === 0) return
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
          ctx.drawImage(videoRef.current, 0, 0)
          const img = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
          const code = jsQR(img.data, img.width, img.height)
          if (code) { clearInterval(qrRef.current!); setAnalysisResult(`QR erkannt: ${code.data}`); stopCamera() }
        }, 300)
      }
    } catch { setAnalysisResult('Kamerazugriff nicht möglich'); setShowCamera(false) }
  }

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return
    setAnalyzing(true)
    const ctx = canvasRef.current.getContext('2d')!
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const image = canvasRef.current.toDataURL('image/jpeg', 0.8)
    stopCamera()
    try {
      const res = await fetch('/api/analyze-food', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      const data = await res.json()
      if (data.name) {
        setNewMeal({ name: data.name, protein: String(data.protein ?? ''), carbs: String(data.carbs ?? ''),
          fat: String(data.fat ?? ''), calories: String(data.calories ?? ''), type: 'snack' })
        setAnalysisResult(`✓ "${data.name}" erkannt — bitte Werte prüfen & anpassen`)
      } else { setAnalysisResult('Kein Essen erkannt — bitte manuell eingeben') }
    } catch { setAnalysisResult('Analyse fehlgeschlagen') }
    setAnalyzing(false)
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Utensils className="w-5 h-5 text-orange-400" />
        <h1 className="text-xl font-bold">Ernährung</h1>
      </div>

      {/* Calories */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold">Kalorien heute</span>
              {fitnessGoal && FITNESS_GOALS[fitnessGoal] && (
                <div className={`flex items-center gap-1 mt-0.5 text-xs font-medium ${FITNESS_GOALS[fitnessGoal].color}`}>
                  <Target className="w-3 h-3" />
                  {FITNESS_GOALS[fitnessGoal].emoji} {FITNESS_GOALS[fitnessGoal].label}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xl font-bold text-orange-400">{totals.calories}</span>
              {calorieGoal > 0 && <span className="text-xs text-muted-foreground">/ {calorieGoal} kcal</span>}
            </div>
          </div>
          {calorieGoal > 0 && (
            <Progress value={Math.min((totals.calories / calorieGoal) * 100, 100)} className="[&>div]:bg-orange-400" />
          )}
          {/* Macro breakdown with percentages */}
          {(() => {
            const totalKcal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
            const pPct = totalKcal > 0 ? Math.round(totals.protein * 4 / totalKcal * 100) : 0
            const cPct = totalKcal > 0 ? Math.round(totals.carbs  * 4 / totalKcal * 100) : 0
            const fPct = totalKcal > 0 ? Math.round(totals.fat    * 9 / totalKcal * 100) : 0
            const targets = MACRO_TARGETS[fitnessGoal] ?? MACRO_TARGETS.halten
            return (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <MacroBar label="Protein" value={totals.protein} pct={pPct} target={targets.protein} color="text-blue-400" />
                <MacroBar label="Kohlenhydr." value={totals.carbs} pct={cPct} target={targets.carbs} color="text-yellow-400" />
                <MacroBar label="Fett" value={totals.fat} pct={fPct} target={targets.fat} color="text-purple-400" />
              </div>
            )
          })()}
          {calorieGoal === 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Fitnessziel in Einstellungen setzen → Kalorienziel wird berechnet
            </p>
          )}
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
            <span className="font-bold text-cyan-400">{water}ml <span className="text-xs text-muted-foreground">/ 2500ml</span></span>
          </div>
          <Progress value={(water / 2500) * 100} className="mb-3 [&>div]:bg-cyan-400" />
          <div className="flex gap-2">
            {[150, 250, 500].map(ml => (
              <Button key={ml} variant="outline" size="sm" onClick={() => saveWater(water + ml)}
                className="flex-1 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 text-xs">+{ml}ml</Button>
            ))}
            {water > 0 && (
              <Button variant="outline" size="sm" onClick={() => saveWater(0)}
                className="border-border text-muted-foreground hover:text-red-400 text-xs px-2">
                <X className="w-3 h-3" />
              </Button>
            )}
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
              <Button onClick={() => { setFastStart(null); localStorage.removeItem('levi_fast_start') }} variant="outline" size="sm"
                className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10">Fasten beenden</Button>
            </div>
          ) : (
            <Button onClick={() => { const now = new Date(); setFastStart(now); localStorage.setItem('levi_fast_start', JSON.stringify(now.toISOString())) }}
              className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30">
              Fasten starten
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Camera Overlay */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 pt-safe">
            <span className="text-white font-medium">
              {cameraMode === 'photo' ? '📸 Essen fotografieren' : '🔍 QR-Code scannen'}
            </span>
            <button onClick={stopCamera}><X className="w-6 h-6 text-white" /></button>
          </div>
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {cameraMode === 'qr' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-emerald-400 rounded-2xl" />
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-6 flex justify-center">
            {cameraMode === 'photo' ? (
              <button onClick={takePhoto} disabled={analyzing}
                className="w-16 h-16 rounded-full bg-white border-4 border-emerald-400 flex items-center justify-center">
                {analyzing ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : <Camera className="w-6 h-6 text-emerald-600" />}
              </button>
            ) : (
              <p className="text-white/70 text-sm">QR-Code in den Rahmen halten</p>
            )}
          </div>
        </div>
      )}

      {/* Camera Buttons – prominent */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => startCamera('photo')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
          <Camera className="w-4 h-4" />Essen fotografieren
        </Button>
        <Button onClick={() => startCamera('qr')} variant="outline"
          className="border-border text-muted-foreground flex items-center gap-2">
          <QrCode className="w-4 h-4" />QR-Code scannen
        </Button>
      </div>

      {/* Meals */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Mahlzeiten heute</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysisResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-400">
              {analysisResult}
            </div>
          )}
          {meals.length === 0 && !analysisResult && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Noch keine Mahlzeiten — 📸 Foto oder manuell eintragen
            </p>
          )}
          {meals.map(meal => {
            const mt = MEAL_TYPES.find(t => t.key === meal.type)
            return (
              <div key={meal.id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{mt?.emoji}</span>
                    <span className="text-sm font-medium truncate">{meal.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    P {meal.protein}g · K {meal.carbs}g · F {meal.fat}g
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-sm font-bold text-orange-400">{meal.calories} kcal</span>
                  <button onClick={() => saveMeals(meals.filter(m => m.id !== meal.id))}
                    className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add form */}
          <div className="border border-dashed border-border rounded-xl p-3 space-y-2 mt-1">
            <div className="flex gap-1">
              {MEAL_TYPES.map(t => (
                <button key={t.key} onClick={() => setNewMeal(p => ({ ...p, type: t.key }))}
                  className={`flex-1 py-1 rounded-lg text-xs transition-colors ${
                    newMeal.type === t.key ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {t.emoji}
                </button>
              ))}
            </div>
            <Input value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))}
              placeholder="Mahlzeit..." className="bg-background border-border text-sm" />
            <div className="grid grid-cols-4 gap-1.5">
              {(['protein', 'carbs', 'fat', 'calories'] as const).map(k => (
                <Input key={k} type="number" value={newMeal[k]}
                  onChange={e => setNewMeal(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={k === 'calories' ? 'kcal' : k === 'protein' ? 'Prot' : k === 'carbs' ? 'Karb' : 'Fett'}
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
