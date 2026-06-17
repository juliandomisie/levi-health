'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, Plus, Trash2, CheckCircle, Circle, Info } from 'lucide-react'

// ESN supplement daily checklist
const SUPPLEMENTS = [
  { key: 'kreatin',    label: 'Kreatin',           dose: '3–5g',          note: 'Creapure® täglich', color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30' },
  { key: 'omega3',     label: 'Omega-3',            dose: '2–3g EPA+DHA',  note: 'zu einer Mahlzeit', color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/30' },
  { key: 'vit_d3k2',  label: 'Vitamin D3+K2',      dose: '2000–5000 IE',  note: 'morgens zum Essen', color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30' },
  { key: 'ashwa',      label: 'Ashwagandha',        dose: '300–600mg KSM', note: 'abends',            color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/30' },
  { key: 'athlete',    label: 'ESN Athlete Stack',  dose: 'wie Etikett',   note: 'Pre-/Postworkout',  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
]

// Blood markers relevant to the ESN supplements above
// Reference ranges based on optimal longevity / ESN targets
const SUPPLEMENT_MARKERS = [
  {
    key: 'vit_d',
    name: 'Vitamin D (25-OH)',
    unit: 'ng/mL',
    supplement: 'Vitamin D3+K2',
    low: 40, optimal: 60, high: 80,
    tip: 'Ziel: 40–80 ng/mL. Unter 30 → Dosis erhöhen. ESN Vitamin D3+K2 enthält 2000 IE.',
    color: 'text-yellow-400',
  },
  {
    key: 'omega3_index',
    name: 'Omega-3 Index',
    unit: '%',
    supplement: 'Omega-3',
    low: 6, optimal: 8, high: 11,
    tip: 'Ziel: >8%. Unter 6% → erhöhe auf 3g EPA+DHA täglich. ESN Omega-3 liefert ~600mg EPA+DHA/Kapsel.',
    color: 'text-cyan-400',
  },
  {
    key: 'kreatinin',
    name: 'Kreatinin',
    unit: 'mg/dL',
    supplement: 'Kreatin',
    low: 0.7, optimal: 1.0, high: 1.2,
    tip: 'Kreatin-Supplementierung kann Kreatinin leicht erhöhen (bis 1.3 normal). Kein Grund zur Sorge.',
    color: 'text-blue-400',
  },
  {
    key: 'testosteron',
    name: 'Testosteron (total)',
    unit: 'ng/dL',
    supplement: 'Ashwagandha',
    low: 400, optimal: 700, high: 900,
    tip: 'Ashwagandha KSM-66 kann Testosteron um ~10–15% erhöhen. Zielbereich: 600–900 ng/dL.',
    color: 'text-purple-400',
  },
  {
    key: 'crp',
    name: 'hs-CRP (Entzündung)',
    unit: 'mg/L',
    supplement: 'Omega-3',
    low: 0, optimal: 0.5, high: 1.0,
    tip: 'Omega-3 reduziert Entzündungsmarker. Ziel: <1 mg/L. Über 3 → Ernährung + Omega-3-Dosis prüfen.',
    color: 'text-red-400',
  },
  {
    key: 'ferritin',
    name: 'Ferritin',
    unit: 'ng/mL',
    supplement: 'ESN Athlete Stack',
    low: 70, optimal: 120, high: 200,
    tip: 'Wichtig für Ausdauer & Energie. ESN Athlete Stack enthält oft Eisen. Ziel: 70–200 ng/mL.',
    color: 'text-emerald-400',
  },
  {
    key: 'k2_osteocalcin',
    name: 'Osteocalcin / K2-Status',
    unit: 'ng/mL',
    supplement: 'Vitamin D3+K2',
    low: 14, optimal: 20, high: 30,
    tip: 'K2 aktiviert Osteocalcin und leitet Kalzium in die Knochen. ESN D3+K2 enthält 100µg MK-7.',
    color: 'text-orange-400',
  },
]

type MarkerEntry = { value: number; date: string }
type SupplementLog = Record<string, string[]> // key → array of dateKeys taken

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

function statusFromValue(marker: typeof SUPPLEMENT_MARKERS[0], value: number): 'good' | 'warn' | 'bad' {
  // For CRP: lower is better
  if (marker.key === 'crp') {
    if (value <= marker.high) return 'good'
    if (value <= 3) return 'warn'
    return 'bad'
  }
  if (value >= marker.low && value <= marker.high) return 'good'
  if (value >= marker.low * 0.8 || value <= marker.high * 1.2) return 'warn'
  return 'bad'
}

const STATUS_STYLE = {
  good: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: '✓ Optimal' },
  warn: { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  label: '⚠ Prüfen' },
  bad:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',      label: '✗ Anpassen' },
}

export default function BiomarkersPage() {
  const [supLog, setSupLog] = useState<SupplementLog>({})
  const [markerValues, setMarkerValues] = useState<Record<string, MarkerEntry[]>>({})
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [expandedTip, setExpandedTip] = useState<string | null>(null)
  const todayKey = new Date().toDateString()

  useEffect(() => {
    setSupLog(load<SupplementLog>('levi_sup_log', {}))
    setMarkerValues(load<Record<string, MarkerEntry[]>>('levi_marker_values', {}))
  }, [])

  const toggleSupplement = (key: string) => {
    const taken = supLog[key] ?? []
    const alreadyToday = taken.includes(todayKey)
    const updated = alreadyToday
      ? { ...supLog, [key]: taken.filter(d => d !== todayKey) }
      : { ...supLog, [key]: [...taken, todayKey] }
    setSupLog(updated)
    localStorage.setItem('levi_sup_log', JSON.stringify(updated))
  }

  const addMarkerValue = (key: string) => {
    if (!inputVal) return
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
    const existing = markerValues[key] ?? []
    const updated = { ...markerValues, [key]: [{ value: +inputVal, date }, ...existing].slice(0, 20) }
    setMarkerValues(updated)
    localStorage.setItem('levi_marker_values', JSON.stringify(updated))
    setInputVal('')
    setAddingFor(null)
  }

  const deleteMarkerEntry = (key: string, idx: number) => {
    const updated = { ...markerValues, [key]: (markerValues[key] ?? []).filter((_, i) => i !== idx) }
    setMarkerValues(updated)
    localStorage.setItem('levi_marker_values', JSON.stringify(updated))
  }

  const todayCount = SUPPLEMENTS.filter(s => (supLog[s.key] ?? []).includes(todayKey)).length

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-5 h-5 text-purple-400" />
        <h1 className="text-xl font-bold">Werte & Supplemente</h1>
      </div>

      {/* Supplement Checklist */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Supplemente heute</CardTitle>
            <span className="text-xs text-muted-foreground">{todayCount}/{SUPPLEMENTS.length} genommen</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
            <div className="h-1.5 rounded-full bg-emerald-400 transition-all"
              style={{ width: `${(todayCount / SUPPLEMENTS.length) * 100}%` }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {SUPPLEMENTS.map(s => {
            const taken = (supLog[s.key] ?? []).includes(todayKey)
            return (
              <button key={s.key} onClick={() => toggleSupplement(s.key)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                  taken ? `${s.bg} ${s.border}` : 'bg-secondary border-border'}`}>
                <div className="flex items-center gap-3">
                  {taken
                    ? <CheckCircle className={`w-5 h-5 ${s.color} shrink-0`} />
                    : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <div className="text-left">
                    <p className={`text-sm font-medium ${taken ? s.color : 'text-foreground'}`}>{s.label}</p>
                    <p className="text-[10px] text-muted-foreground">{s.dose} · {s.note}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Blood marker cards per supplement */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground px-1">Blutwerte · Tippe auf + um einen neuen Wert einzutragen</p>
        {SUPPLEMENT_MARKERS.map(marker => {
          const entries = markerValues[marker.key] ?? []
          const latest = entries[0]
          const status = latest ? statusFromValue(marker, latest.value) : null
          const s = status ? STATUS_STYLE[status] : null

          return (
            <Card key={marker.key} className={`border ${s?.border ?? 'border-border'} ${s?.bg ?? 'bg-card'}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{marker.name}</p>
                    <p className="text-[10px] text-muted-foreground">Supplement: {marker.supplement}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {latest && (
                      <div className="text-right">
                        <p className={`text-xl font-bold ${s?.text ?? marker.color}`}>{latest.value}</p>
                        <p className="text-[10px] text-muted-foreground">{marker.unit}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <button onClick={() => setAddingFor(addingFor === marker.key ? null : marker.key)}
                        className="text-muted-foreground hover:text-emerald-400 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedTip(expandedTip === marker.key ? null : marker.key)}
                        className="text-muted-foreground hover:text-blue-400 transition-colors">
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reference range bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>{marker.low} {marker.unit}</span>
                    <span className="text-center">Optimal: {marker.optimal} {marker.unit}</span>
                    <span>{marker.high} {marker.unit}</span>
                  </div>
                  <div className="relative w-full bg-secondary rounded-full h-2">
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400/30"
                        style={{ marginLeft: '20%', width: '60%' }} />
                    </div>
                    {latest && (
                      <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background ${
                        s?.bg?.replace('bg-', 'bg-') ?? 'bg-gray-400'} ${s?.text?.replace('text-', 'bg-').replace('400', '500') ?? ''}`}
                        style={{
                          left: `${Math.min(95, Math.max(5, ((latest.value - marker.low * 0.5) / (marker.high * 1.5 - marker.low * 0.5)) * 100))}%`,
                        }} />
                    )}
                  </div>
                </div>

                {status && (
                  <Badge className={`text-xs border-0 ${s?.bg} ${s?.text}`}>{s?.label}</Badge>
                )}

                {/* Tip */}
                {expandedTip === marker.key && (
                  <p className="text-xs text-muted-foreground bg-secondary rounded-xl p-2.5 italic">
                    {marker.tip}
                  </p>
                )}

                {/* Add value form */}
                {addingFor === marker.key && (
                  <div className="flex gap-2 pt-1">
                    <Input type="number" step="0.1" value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder={`Wert in ${marker.unit}...`}
                      className="bg-background border-border text-sm"
                      onKeyDown={e => e.key === 'Enter' && addMarkerValue(marker.key)} />
                    <Button onClick={() => addMarkerValue(marker.key)}
                      size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                      Speichern
                    </Button>
                  </div>
                )}

                {/* History (last 3 entries) */}
                {entries.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {entries.slice(0, 3).map((e, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">{e.date}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${i === 0 ? s?.text ?? marker.color : 'text-muted-foreground'}`}>
                            {e.value} {marker.unit}
                          </span>
                          <button onClick={() => deleteMarkerEntry(marker.key, i)}
                            className="text-muted-foreground hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {entries.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-1">
                    Noch kein Wert — tippe auf + um einzutragen
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
