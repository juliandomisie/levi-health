'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Utensils, Droplets, Timer, Plus, Flame, Camera, X, Trash2, Barcode, Loader2, Target, Sparkles, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

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

function MacroBar({ label, value, target, targetG, color }: { label: string; value: number; target: number; targetG: number; color: string }) {
  const progress = targetG > 0 ? Math.min((value / targetG) * 100, 100) : 0
  const remaining = targetG > 0 ? Math.max(0, targetG - value) : null
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className={color + ' font-bold'}>
          {value}g{targetG > 0 ? ` / ${targetG}g` : ''}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all min-w-0 ${value > 0 ? color.replace('text-', 'bg-') : ''}`}
          style={{ width: value > 0 ? `${Math.max(progress, 4)}%` : '0%' }} />
      </div>
      <p className="text-[9px] text-muted-foreground text-right">
        {remaining !== null ? `noch ${remaining}g` : `Ziel: ${target}%`}
      </p>
    </div>
  )
}

export default function NutritionPage() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [water, setWater] = useState(0)
  const [fastStart, setFastStart] = useState<Date | null>(null)
  const [fastElapsed, setFastElapsed] = useState('00:00:00')
  const [newMeal, setNewMeal] = useState({ name: '', protein: '', carbs: '', fat: '', calories: '', type: 'snack' })
  const [calorieGoal, setCalorieGoal] = useState(0)
  const [fitnessGoal, setFitnessGoal] = useState('halten')
  const [macroTargets, setMacroTargets] = useState({ protein: 30, carbs: 40, fat: 30 })
  const [showMacroEdit, setShowMacroEdit] = useState(false)
  const [gramsInput, setGramsInput] = useState('')
  const [per100g, setPer100g] = useState<{ cal: number; prot: number; carbs: number; fat: number } | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<'photo' | 'barcode'>('photo')
  const [analyzing, setAnalyzing] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [aiSuggestion, setAiSuggestion] = useState<{ name: string; calories: number; protein: number; carbs: number; fat: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const barcodeReaderRef = useRef<import('@zxing/browser').BrowserMultiFormatReader | null>(null)
  const suggestTimerRef = useRef<NodeJS.Timeout | null>(null)

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
    const goal = load<string>('levi_fitness_goal', 'halten')
    const defaults = MACRO_TARGETS[goal] ?? MACRO_TARGETS.halten
    const raw = localStorage.getItem('levi_macro_targets')
    let saved: Record<string, number> = {}
    try { saved = raw ? JSON.parse(raw) : {} } catch { saved = {} }
    const merged = {
      protein: (saved.protein > 0 ? saved.protein : null) ?? defaults.protein,
      carbs:   (saved.carbs   > 0 ? saved.carbs   : null) ?? defaults.carbs,
      fat:     (saved.fat     > 0 ? saved.fat     : null) ?? defaults.fat,
    }
    setMacroTargets(merged)
    localStorage.setItem('levi_macro_targets', JSON.stringify(merged))
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

  // AI suggestion when user types food name
  const handleFoodNameChange = (name: string) => {
    setNewMeal(p => ({ ...p, name }))
    setAiSuggestion(null)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (name.length < 3) return
    suggestTimerRef.current = setTimeout(async () => {
      setSuggesting(true)
      try {
        const res = await fetch('/api/suggest-nutrition', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ food: name }),
        })
        const data = await res.json()
        if (data.calories) setAiSuggestion(data)
      } catch { /* silent */ }
      setSuggesting(false)
    }, 900)
  }

  const handleGramsChange = (g: string) => {
    setGramsInput(g)
    if (per100g && +g > 0) {
      const f = +g / 100
      setNewMeal(p => ({
        ...p,
        calories: String(Math.round(per100g.cal  * f)),
        protein:  String(Math.round(per100g.prot  * f)),
        carbs:    String(Math.round(per100g.carbs * f)),
        fat:      String(Math.round(per100g.fat   * f)),
      }))
    }
  }

  const applySuggestion = () => {
    if (!aiSuggestion) return
    setPer100g({ cal: aiSuggestion.calories, prot: aiSuggestion.protein, carbs: aiSuggestion.carbs, fat: aiSuggestion.fat })
    setGramsInput('100')
    setNewMeal(p => ({
      ...p,
      name: aiSuggestion.name || p.name,
      calories: String(aiSuggestion.calories),
      protein: String(aiSuggestion.protein),
      carbs: String(aiSuggestion.carbs),
      fat: String(aiSuggestion.fat),
    }))
    setAiSuggestion(null)
  }

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
    setAiSuggestion(null)
    setGramsInput('')
    setPer100g(null)
  }

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    barcodeReaderRef.current = null
    setShowCamera(false)
  }, [])

  const startCamera = async (mode: 'photo' | 'barcode') => {
    setCameraMode(mode)
    setAnalysisResult('')
    setShowCamera(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream

      if (mode === 'photo') {
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      } else {
        // Barcode mode: use ZXing
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        barcodeReaderRef.current = reader

        reader.decodeFromStream(stream, videoRef.current!, async (result) => {
          if (result) {
            const barcode = result.getText()
            barcodeReaderRef.current = null
            stopCamera()
            setAnalyzing(true)
            try {
              const res = await fetch(`https://world.openfoodfacts.org/api/v3/product/${barcode}.json`)
              const data = await res.json()
              const p = data?.product
              if (p) {
                const n = p.nutriments
                const name = p.product_name_de || p.product_name || `EAN ${barcode}`
                const base = {
                  cal:   Math.round(n['energy-kcal_100g'] ?? 0),
                  prot:  Math.round(n['proteins_100g'] ?? 0),
                  carbs: Math.round(n['carbohydrates_100g'] ?? 0),
                  fat:   Math.round(n['fat_100g'] ?? 0),
                }
                setPer100g(base)
                setGramsInput('100')
                setNewMeal({
                  name,
                  calories: String(base.cal),
                  protein:  String(base.prot),
                  carbs:    String(base.carbs),
                  fat:      String(base.fat),
                  type: 'snack',
                })
                setAnalysisResult(`✓ "${name}" — Gramm anpassen für genaue Werte`)
              } else {
                setAnalysisResult(`Barcode ${barcode} nicht in Datenbank — bitte manuell eingeben`)
              }
            } catch {
              setAnalysisResult('Barcode-Lookup fehlgeschlagen')
            }
            setAnalyzing(false)
          }
        })
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
        const base = { cal: data.calories ?? 0, prot: data.protein ?? 0, carbs: data.carbs ?? 0, fat: data.fat ?? 0 }
        setPer100g(base)
        setGramsInput('100')
        setNewMeal({ name: data.name, protein: String(base.prot), carbs: String(base.carbs),
          fat: String(base.fat), calories: String(base.cal), type: 'snack' })
        setAnalysisResult(`✓ "${data.name}" erkannt — Gramm anpassen & Werte prüfen`)
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

      {/* Calories + Macros */}
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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-xl font-bold text-orange-400">{totals.calories}</span>
                {calorieGoal > 0 && <span className="text-xs text-muted-foreground">/ {calorieGoal} kcal</span>}
              </div>
              <button onClick={() => setShowMacroEdit(p => !p)}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {calorieGoal > 0 && (
            <Progress value={Math.min((totals.calories / calorieGoal) * 100, 100)} className="[&>div]:bg-orange-400" />
          )}

          {/* Macro bars */}
          {(() => {
            const tProteinG = calorieGoal > 0 ? Math.round(calorieGoal * (macroTargets.protein ?? 30) / 100 / 4) : 0
            const tCarbsG   = calorieGoal > 0 ? Math.round(calorieGoal * (macroTargets.carbs   ?? 40) / 100 / 4) : 0
            const tFatG     = calorieGoal > 0 ? Math.round(calorieGoal * (macroTargets.fat     ?? 30) / 100 / 9) : 0
            return (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <MacroBar label="Protein"     value={totals.protein} target={macroTargets.protein ?? 30} targetG={tProteinG} color="text-blue-400" />
                <MacroBar label="Kohlenhydr." value={totals.carbs}   target={macroTargets.carbs   ?? 40} targetG={tCarbsG}   color="text-yellow-400" />
                <MacroBar label="Fett"        value={totals.fat}     target={macroTargets.fat     ?? 30} targetG={tFatG}     color="text-purple-400" />
              </div>
            )
          })()}

          {/* Macro editor */}
          {showMacroEdit && (() => {
            const total = macroTargets.protein + macroTargets.carbs + macroTargets.fat
            const ok = total === 100
            const updateMacro = (key: 'protein' | 'carbs' | 'fat', val: number) => {
              const updated = { ...macroTargets, [key]: Math.max(0, Math.min(100, val)) }
              setMacroTargets(updated)
              localStorage.setItem('levi_macro_targets', JSON.stringify(updated))
            }
            return (
              <div className="bg-secondary rounded-xl p-3 space-y-3 mt-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium">Makro-Ziele anpassen</p>
                  <span className={`text-xs font-bold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {total}% {ok ? '✓' : '≠ 100%'}
                  </span>
                </div>
                {([
                  { key: 'protein' as const, label: 'Protein', color: 'text-blue-400', kcalPer: 4 },
                  { key: 'carbs'   as const, label: 'Kohlenhydrate', color: 'text-yellow-400', kcalPer: 4 },
                  { key: 'fat'     as const, label: 'Fett', color: 'text-purple-400', kcalPer: 9 },
                ]).map(({ key, label, color, kcalPer }) => {
                  const grams = calorieGoal > 0 ? Math.round(calorieGoal * macroTargets[key] / 100 / kcalPer) : null
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-medium ${color}`}>{label}</span>
                        <span className="text-muted-foreground">
                          {grams !== null ? `${macroTargets[key]}% = ${grams}g` : `${macroTargets[key]}%`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateMacro(key, macroTargets[key] - 5)}
                          className="w-7 h-7 rounded-lg bg-card flex items-center justify-center text-sm font-bold text-muted-foreground hover:text-foreground">−</button>
                        <div className="flex-1 bg-card rounded-full h-2">
                          <div className={`h-2 rounded-full ${color.replace('text-', 'bg-')}`}
                            style={{ width: `${macroTargets[key]}%` }} />
                        </div>
                        <button onClick={() => updateMacro(key, macroTargets[key] + 5)}
                          className="w-7 h-7 rounded-lg bg-card flex items-center justify-center text-sm font-bold text-muted-foreground hover:text-foreground">+</button>
                        <Input type="number" value={macroTargets[key]}
                          onChange={e => updateMacro(key, +e.target.value)}
                          className="w-14 h-7 text-xs text-center bg-card border-border p-1" />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  )
                })}
                {calorieGoal === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">Kalorienziel in Einstellungen setzen für Gramm-Anzeige</p>
                )}
              </div>
            )
          })()}

          {calorieGoal === 0 && !showMacroEdit && (
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
              {cameraMode === 'photo' ? '📸 Essen fotografieren' : '🔍 Barcode scannen'}
            </span>
            <button onClick={stopCamera}><X className="w-6 h-6 text-white" /></button>
          </div>
          <div className="flex-1 relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {cameraMode === 'barcode' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-72 h-32 border-2 border-emerald-400 rounded-xl">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />
                </div>
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
              <p className="text-white/70 text-sm text-center">Barcode in den Rahmen halten — wird automatisch erkannt</p>
            )}
          </div>
        </div>
      )}

      {/* Camera Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => startCamera('photo')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
          <Camera className="w-4 h-4" />Essen fotografieren
        </Button>
        <Button onClick={() => startCamera('barcode')} variant="outline"
          className="border-border text-muted-foreground flex items-center gap-2">
          <Barcode className="w-4 h-4" />Barcode scannen
        </Button>
      </div>

      {/* Meals */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold">Mahlzeiten heute</p>

          {analysisResult && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-400">
              {analysisResult}
            </div>
          )}

          {meals.length === 0 && !analysisResult && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Noch keine Mahlzeiten — 📸 Foto, Barcode oder manuell eintragen
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

            {/* Food name + AI suggestion */}
            <div className="relative">
              <Input value={newMeal.name} onChange={e => handleFoodNameChange(e.target.value)}
                placeholder="Mahlzeit (z.B. Banane, Hähnchenbrust)..."
                className="bg-background border-border text-sm pr-8" />
              {suggesting && (
                <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Gram input — always visible, scales macros when per100g is set */}
            <div className="flex items-center gap-2">
              <Input type="number" value={gramsInput} onChange={e => handleGramsChange(e.target.value)}
                placeholder="Menge in Gramm..."
                className="bg-background border-border text-sm" />
              <span className="text-xs text-muted-foreground shrink-0">g</span>
              {per100g && gramsInput ? (
                <span className="text-[10px] text-emerald-400 shrink-0">↻ skaliert</span>
              ) : (
                <span className="text-[10px] text-muted-foreground shrink-0">optional</span>
              )}
            </div>

            {/* AI suggestion banner */}
            {aiSuggestion && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    Levi schätzt: {aiSuggestion.name}
                  </div>
                  <button onClick={() => setAiSuggestion(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs">
                  <div className="bg-secondary rounded-lg p-1.5">
                    <p className="text-orange-400 font-bold">{aiSuggestion.calories}</p>
                    <p className="text-muted-foreground text-[9px]">kcal</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-1.5">
                    <p className="text-blue-400 font-bold">{aiSuggestion.protein}g</p>
                    <p className="text-muted-foreground text-[9px]">Protein</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-1.5">
                    <p className="text-yellow-400 font-bold">{aiSuggestion.carbs}g</p>
                    <p className="text-muted-foreground text-[9px]">Karbs</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-1.5">
                    <p className="text-purple-400 font-bold">{aiSuggestion.fat}g</p>
                    <p className="text-muted-foreground text-[9px]">Fett</p>
                  </div>
                </div>
                <Button onClick={applySuggestion} size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
                  Übernehmen
                </Button>
              </div>
            )}

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
